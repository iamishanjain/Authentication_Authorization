import mongoose from "mongoose";
import { ServerConfig } from "../config";
import { Logger } from "../lib";

// Old simple approach
// export async function connectToDB() {
//   try {
//     await mongoose.connect(ServerConfig.MONGO.MONGO_URI!);
//     Logger.info("Database connection has been successfully established");
//   } catch (error) {
//     Logger.error("Error in connecting to DB", { error: error });
//     process.exit(1);
//   }
// }

// Production-ready approach with retry logic, connection pooling, and event handlers
export async function connectToDB(retries = 5, delay = 5000) {
  const mongoOptions = {
    // Connection pool settings for better performance
    maxPoolSize: 10, // Maximum number of connections in the pool
    minPoolSize: 2, // Minimum number of connections in the pool

    // Timeout settings
    serverSelectionTimeoutMS: 5000, // Timeout for selecting a server
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    connectTimeoutMS: 10000, // Give up initial connection after 10 seconds

    // Automatic index creation (disable in production for better performance)
    autoIndex: ServerConfig.ENVIRONMENT.NODE_ENV !== "production",

    // Buffering options
    bufferCommands: false, // Disable buffering to fail fast

    // Compression (optional - reduces bandwidth but adds CPU overhead)
    // compressors: ['zlib'],

    // Write concern for production reliability
    w: "majority" as const, // Wait for majority of replica set to acknowledge writes
    retryWrites: true, // Automatically retry failed writes
    retryReads: true, // Automatically retry failed reads
  };

  let attempt = 0;

  while (attempt < retries) {
    try {
      attempt++;
      Logger.info(
        `Attempting database connection (Attempt ${attempt}/${retries})...`,
      );

      await mongoose.connect(ServerConfig.MONGO.MONGO_URI!, mongoOptions);

      Logger.info("Database connection has been successfully established", {
        host: mongoose.connection.host,
        name: mongoose.connection.name,
      });

      // Connection event listeners
      mongoose.connection.on("connected", () => {
        Logger.info("Mongoose connected to MongoDB");
      });

      mongoose.connection.on("error", (err) => {
        Logger.error("Mongoose connection error", { error: err });
      });

      mongoose.connection.on("disconnected", () => {
        Logger.warn("Mongoose disconnected from MongoDB");
      });

      mongoose.connection.on("reconnected", () => {
        Logger.info("Mongoose reconnected to MongoDB");
      });

      // Graceful shutdown handlers
      process.on("SIGINT", async () => {
        await gracefulShutdown("SIGINT");
      });

      process.on("SIGTERM", async () => {
        await gracefulShutdown("SIGTERM");
      });

      return; // Success - exit function
    } catch (error) {
      Logger.error(
        `Error in connecting to DB (Attempt ${attempt}/${retries})`,
        {
          error: error,
          willRetry: attempt < retries,
        },
      );

      if (attempt >= retries) {
        Logger.error("Failed to connect to database after maximum retries");
        process.exit(1);
      }

      // Wait before retrying
      Logger.info(`Retrying in ${delay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// Graceful shutdown function
async function gracefulShutdown(signal: string) {
  Logger.info(`${signal} received. Closing MongoDB connection gracefully...`);
  try {
    await mongoose.connection.close();
    Logger.info("MongoDB connection closed successfully");
    process.exit(0);
  } catch (error) {
    Logger.error("Error during graceful shutdown", { error });
    process.exit(1);
  }
}
