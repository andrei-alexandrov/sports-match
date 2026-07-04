import MongoStore from "connect-mongo";
import express from "express";
import session from "express-session";
import type { MongoClient } from "mongodb";
import mongoose from "mongoose";
import { config } from "./config";
import { errorHandler, notFoundHandler } from "./errors";
import { authRouter } from "./routes/auth";

export function createApp(): express.Express {
  const app = express();
  app.set("trust proxy", 1);
  // 5mb: profile images travel as data URLs for now (see spec).
  app.use(express.json({ limit: "5mb" }));
  app.use(
    session({
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        // mongoose bundles its own mongodb driver; the cast bridges the two packages' nominal types.
        client: mongoose.connection.getClient() as unknown as MongoClient,
      }),
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: config.isProduction,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  );

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
