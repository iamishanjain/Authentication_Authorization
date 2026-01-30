import { createLogger, transports, format, addColors } from "winston";
import { DailyRotateFile } from "winston/lib/winston/transports";
import path from "path";

const customLevels = {
  levels: {
    critical: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
  },
  colors: {
    critical: "red",
    error: "red",
    warn: "yellow",
    info: "green",
    debug: "blue",
  },
};

// Add custom colors to winston
addColors(customLevels.colors);

// Determine environment
const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = !isProduction;

// Log directory
const logDir = path.join(process.cwd(), "logs");

// Console format for development (colorized and readable)
const consoleFormat = format.combine(
  format.colorize({ all: true }),
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length
      ? JSON.stringify(meta, null, 2)
      : "";
    return `${timestamp} ${level}: ${message} ${metaStr}`;
  }),
);

// JSON format for production (machine-readable)
const productionFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.errors({ stack: true }), // Include stack trace for errors
  format.json(),
);

// Create transports array based on environment
const logTransports: any[] = [];

// Console transport (always enabled)
logTransports.push(
  new transports.Console({
    format: isDevelopment ? consoleFormat : productionFormat,
  }),
);

// File transports (production or if explicitly enabled)
if (isProduction || process.env.ENABLE_FILE_LOGGING === "true") {
  // Combined logs
  logTransports.push(
    new transports.File({
      filename: path.join(logDir, "combined.log"),
      format: productionFormat,
    }),
  );

  // Error logs only
  logTransports.push(
    new transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      format: productionFormat,
    }),
  );

  // Daily rotate file
  logTransports.push(
    new DailyRotateFile({
      dirname: logDir,
      filename: "application-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
      format: productionFormat,
    }),
  );
}

const logger = createLogger({
  levels: customLevels.levels,
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  format: productionFormat,
  transports: logTransports,
  // Handle uncaught exceptions
  exceptionHandlers: isProduction
    ? [
        new transports.File({
          filename: path.join(logDir, "exceptions.log"),
        }),
      ]
    : [],
  // Handle unhandled promise rejections
  rejectionHandlers: isProduction
    ? [
        new transports.File({
          filename: path.join(logDir, "rejections.log"),
        }),
      ]
    : [],
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Add stream method for Morgan or other integrations
logger.stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
} as any;

export default logger;
