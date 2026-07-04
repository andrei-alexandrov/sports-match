import MongoStore from "connect-mongo";
import type express from "express";
import session from "express-session";
import type { MongoClient } from "mongodb";
import mongoose from "mongoose";
import { config } from "./config";

/**
 * One session middleware shared by the Express app and the Socket.io
 * handshake (io.engine.use) — the same httpOnly cookie authenticates both.
 */
export function createSessionMiddleware(): express.RequestHandler {
  return session({
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
  });
}
