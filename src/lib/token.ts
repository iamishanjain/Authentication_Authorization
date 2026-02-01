import jwt from "jsonwebtoken";
import { ServerConfig } from "../config";

export function createAccessToken(
  userId: string,
  role: "USER" | "ADMIN",
  tokenVersion: number,
) {
  const payload = { sub: userId, role, tokenVersion };

  return jwt.sign(payload, ServerConfig.JWT.JWT_ACCESS_SECRET!, {
    expiresIn: "30m",
  });
}

export function createRefreshToken(userId: string, tokenVersion: number) {
  const payload = { sub: userId, tokenVersion };

  return jwt.sign(payload, ServerConfig.JWT.JWT_REFRESH_SECRET!, {
    expiresIn: "7d",
  });
}
