import express from "express";
import cookieParser from "cookie-parser";
import { StatusCodes } from "http-status-codes";
import { authRoutes } from "./routes";
const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(cookieParser());

app.use("/api/v1", authRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: StatusCodes.OK, message: "Server is healthy" });
});

export default app;
