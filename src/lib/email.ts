import nodemailer from "nodemailer";

import { ServerConfig } from "../config";
import { Logger } from ".";

export async function sendEmail(to: string, subject: string, html: string) {
  if (
    !ServerConfig.SMTP.HOST ||
    !ServerConfig.SMTP.PASS ||
    !ServerConfig.SMTP.USER
  ) {
    Logger.error("Email Enviormenr variables are not present");
    console.log("Email Enviormenr variables are not present");
    return;
  }

  const host = ServerConfig.SMTP.HOST;
  const user = ServerConfig.SMTP.USER;
  const port = Number(ServerConfig.SMTP.PORT || 587);
  const pass = ServerConfig.SMTP.PASS;
  const from = ServerConfig.SMTP.EMAIL_FROM;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });
}
