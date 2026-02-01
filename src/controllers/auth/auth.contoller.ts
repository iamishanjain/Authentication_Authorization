import { StatusCodes } from "http-status-codes";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import {
  Logger,
  handleControllerError,
  successResponse,
  asyncHandler,
  sendEmail,
  hashPassword,
  checkHashPassword,
  createAccessToken,
  createRefreshToken,
} from "../../lib";
import { loginSchema, registerSchema } from "./auth.schema";
import { User } from "../../models";
import { ServerConfig } from "../../config";

// Old approach - manual error handling
// export async function registerHandler(req: Request, res: Response) {
//   Logger.info("Register Controller endpoint hit");
//   try {
//     const result = registerSchema.safeParse(req.body);
//   } catch (error) {
//     Logger.error("Error in Register Controller", { error: error });
//     res
//       .status(StatusCodes.INTERNAL_SERVER_ERROR)
//       .json({ success: false, message: "Facing error in registring user" });
//   }
// }

// New approach - using common error handler

function getAppURL() {
  return (
    ServerConfig.APP_URL || `http://localhost:${ServerConfig.ENVIRONMENT.PORT}`
  );
}

export async function registerHandler(req: Request, res: Response) {
  Logger.info("Register Controller endpoint hit");
  try {
    // Validate request body with Zod
    const userDetails = registerSchema.safeParse(req.body);
    if (!userDetails.success) {
      Logger.error("Invalid Data! entered in Register Controller");
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid Data!",
        errors: userDetails.error.flatten(),
      });
    }
    const { name, email, password } = userDetails.data;

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: "Given Email is already in use, Try with diffrent Email",
      });
    }
    const passwordHash = await hashPassword(password);

    const newlyCreatedUser = await User.create({
      email: normalizedEmail,
      passwordHash,
      role: "USER",
      isEmailVerified: false,
      twoFactorEnabled: false,
    });

    const verifyToken = jwt.sign(
      {
        sub: newlyCreatedUser.id,
      },
      ServerConfig.JWT.JWT_ACCESS_SECRET!,
      {
        expiresIn: "1d",
      },
    );

    const verifyURL = `${getAppURL}/auth/verify-email?token=${verifyToken}`;

    await sendEmail(
      newlyCreatedUser.email,
      "Verify your email",
      `<p>Please verify your email by checking this link:</p>
      <p><a hrefd=${verifyURL}>${verifyURL}</a></p>
      `,
    );

    await newlyCreatedUser.save();
    Logger.info("User registered Successfully");
    // Return success response
    return successResponse(
      res,
      StatusCodes.CREATED,
      "User registered successfully",
      newlyCreatedUser,
    );
  } catch (error) {
    Logger.error("Error in registering User", { error: error });
    return handleControllerError(
      res,
      error,
      "Register Controller",
      "Failed to register user",
    );
  }
}

export async function verifyEmailhandler(req: Request, res: Response) {
  Logger.info("verifyEmailhandler Controller endpoint hit");
  const token = req.query.token as string | undefined;
  if (!token) {
    Logger.error("Verification token is missing");
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ success: false, message: "token is missing in the URL" });
  }
  try {
    const payload = jwt.verify(token, ServerConfig.JWT.JWT_ACCESS_SECRET!) as {
      sub: string;
    };

    const user = await User.findById(payload.sub);
    if (!user) {
      Logger.error("User not found");
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: "User not found" });
    }
    if (user.isEmailVerified) {
      Logger.error("Email already Verified");
      return res
        .status(StatusCodes.CONFLICT)
        .json({ success: false, message: "This USer Email already Verified" });
    }
    user.isEmailVerified = true;
    await user.save();
    Logger.info("Email is now verified");
    return successResponse(
      res,
      StatusCodes.OK,
      "Email is now verified!! You can Proceed to login now",
      user,
    );
  } catch (error) {
    Logger.error("Error in Verifying user Email", { error: error });
    return handleControllerError(
      res,
      error,
      "Verify Email Controller",
      "Failed to Verify user Email",
    );
  }
}

export async function loginHandler(req: Request, res: Response) {
  Logger.info("Login Controller endpoint hit");
  try {
    const userDetails = loginSchema.safeParse(req.body);
    if (!userDetails.success) {
      Logger.error("Invalid Data! entered in Login Controller");
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid Data!",
        errors: userDetails.error.flatten(),
      });
    }
    const { email, password } = userDetails.data;
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      Logger.error("User Not found");
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "User with the given mail not found!",
      });
    }

    const ok = await checkHashPassword(password, user.passwordHash);
    if (!ok) {
      Logger.error("Entered password is not correct");
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Password entered by user is not correct",
      });
    }
    if (!user.isEmailVerified) {
      Logger.error("User Email is not verified");
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "The enetred Email by user is not verified",
      });
    }
    const accessToken = createAccessToken(
      user.id,
      user.role,
      user.tokenVersion,
    );

    const refreshToken = createRefreshToken(user.id, user.tokenVersion);
    const isProd = ServerConfig.ENVIRONMENT.NODE_ENV === "production";
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 7 * 2 * 60 * 1000,
    });
    Logger.info("User Login Successfully");
    // Return success response
    return successResponse(res, StatusCodes.OK, "User Logedin successfully", {
      id: user.id,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      twofactorEnabled: user.twoFactorEnabled,
    });
  } catch (error) {
    Logger.error("Error in Login user", { error: error });
    return handleControllerError(
      res,
      error,
      "Login Controller Error",
      "Failed to login  user",
    );
  }
}

//TODO :- in verifyEmailhandler want to send the selected properties of newlyCreatedUSer only not the complete object
