import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Logger } from "./index";

// Custom API Error class
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true,
    public stack = "",
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Common error handler for controllers
 * @param res - Express Response object
 * @param error - Error object
 * @param context - Context string for logging (e.g., "Register Controller")
 * @param defaultMessage - Default user-facing message
 */
export function handleControllerError(
  res: Response,
  error: any,
  context: string,
  defaultMessage: string = "An error occurred while processing your request",
): Response {
  // Log the error with context
  Logger.error(`Error in ${context}`, {
    error: error?.message || error,
    stack: error?.stack,
    name: error?.name,
  });

  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: error?.message || defaultMessage,
  });
}
/**
 * Async handler wrapper to catch errors in async controllers
 * @param fn - Async controller function
 */
export function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create common success response
 */
export function successResponse(
  res: Response,
  statusCode: number = StatusCodes.OK,
  message: string,
  data?: any,
) {
  return res.status(statusCode).json({
    success: true,
    message,
    ...(data && { data }),
  });
}
