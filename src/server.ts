import express from "express";
import http from "http";
import app from "./app";
import { connectToDB, ServerConfig } from "./config";
import { Logger } from "./lib";

// Old simple approach
// async function startServer() {
//   connectToDB();
//   const server = http.createServer(app);
//   server.listen(ServerConfig.ENVIRONMENT.PORT, () => {
//     console.log(`Server started at Port no : ${ServerConfig.ENVIRONMENT.PORT}`);
//     Logger.info(`Server started at Port no : ${ServerConfig.ENVIRONMENT.PORT}`);
//   });
// }

// Production-ready approach with error handling and graceful shutdown
async function startServer() {
  try {
    // Connect to database first
    Logger.info("Starting application...");
    await connectToDB();

    const server = http.createServer(app);

    // Server timeout configurations for production
    server.keepAliveTimeout = 65000; // Slightly higher than ALB idle timeout (60s)
    server.headersTimeout = 66000; // Slightly higher than keepAliveTimeout

    // Start listening
    server.listen(ServerConfig.ENVIRONMENT.PORT, () => {
      Logger.info(`Server successfully started`, {
        port: ServerConfig.ENVIRONMENT.PORT,
        environment: ServerConfig.ENVIRONMENT.NODE_ENV,
        pid: process.pid,
      });
    });

    // Handle server errors
    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        Logger.error(`Port ${ServerConfig.ENVIRONMENT.PORT} is already in use`);
      } else if (error.code === "EACCES") {
        Logger.error(
          `Port ${ServerConfig.ENVIRONMENT.PORT} requires elevated privileges`,
        );
      } else {
        Logger.error("Server error occurred", { error });
      }
      process.exit(1);
    });

    // Graceful shutdown on SIGTERM (e.g., from Docker, Kubernetes)
    process.on("SIGTERM", () => {
      Logger.info("SIGTERM signal received: closing HTTP server gracefully");
      server.close(() => {
        Logger.info("HTTP server closed");
        process.exit(0);
      });

      //   // Force close after 30 seconds
      //   setTimeout(() => {
      //     Logger.error(
      //       "Could not close connections in time, forcefully shutting down",
      //     );
      //     process.exit(1);
      //   }, 30000);
    });

    // Graceful shutdown on SIGINT (Ctrl+C)
    process.on("SIGINT", () => {
      Logger.info("SIGINT signal received: closing HTTP server gracefully");
      server.close(() => {
        Logger.info("HTTP server closed");
        process.exit(0);
      });

      //   // Force close after 30 seconds
      //   setTimeout(() => {
      //     Logger.error(
      //       "Could not close connections in time, forcefully shutting down",
      //     );
      //     process.exit(1);
      //   }, 30000);
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (error: Error) => {
      Logger.error("Uncaught Exception", { error });
      // Give logger time to write before exiting
      setTimeout(() => process.exit(1), 1000);
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason: any) => {
      Logger.error("Unhandled Rejection", { reason });
      // Give logger time to write before exiting
      setTimeout(() => process.exit(1), 1000);
    });
  } catch (error) {
    Logger.error("Failed to start server", { error });
    process.exit(1);
  }
}

// Start the server
startServer();
