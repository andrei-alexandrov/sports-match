import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  mongoUrl: process.env.MONGO_URL ?? "",
  sessionSecret: process.env.SESSION_SECRET ?? "dev-secret-change-me",
  isProduction: process.env.NODE_ENV === "production",
};
