process.loadEnvFile();

// Old approach - Object literal
// const ServerConfig = {
//   MONGO: {
//     MONGO_URI: process.env.MONGO_URI,
//   },
//   JWT: {
//     JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
//     JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
//   },
// };
// export default ServerConfig;

// New approach - Class instance (Singleton pattern)
class ServerConfig {
  public ENVIRONMENT = {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  };

  public MONGO = {
    MONGO_URI: process.env.MONGO_URI,
  };

  public JWT = {
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  };

  public SMTP = {
    HOST: process.env.SMTP_HOST,
    PORT: process.env.SMTP_PORT
      ? parseInt(process.env.SMTP_PORT, 10)
      : undefined,
    USER: process.env.SMTP_USER,
    PASS: process.env.SMTP_PASS,
  };

  public EMAIL = {
    FROM: process.env.EMAIL_FROM || "My App <no-reply@myapp.com>",
  };

  public GOOGLE = {
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI:
      process.env.GOOGLE_REDIRECT_URI ||
      "https://localhost:5000/auth/google/callback",
  };
}

export default new ServerConfig();
