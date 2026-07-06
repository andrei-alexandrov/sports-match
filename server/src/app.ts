import compression from "compression";
import express from "express";
import { errorHandler, notFoundHandler } from "./errors";
import { authRouter } from "./routes/auth";
import { eventsRouter } from "./routes/events";
import { messagesRouter } from "./routes/messages";
import { placesRouter } from "./routes/places";
import { usersRouter } from "./routes/users";
import { serveClient } from "./serveClient";
import { createSessionMiddleware } from "./session";

export interface CreateAppOptions {
  /** Absolute path to the built SPA. When set (production boot), static
   *  files + an SPA fallback are served next to the API. */
  clientDist?: string;
}

export function createApp(
  sessionMiddleware: express.RequestHandler = createSessionMiddleware(),
  options: CreateAppOptions = {},
): express.Express {
  const app = express();
  app.set("trust proxy", 1);
  app.use(compression());
  // 5mb: profile images travel as data URLs for now (see spec).
  app.use(express.json({ limit: "5mb" }));
  app.use(sessionMiddleware);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/messages", messagesRouter);
  app.use("/api/places", placesRouter);
  app.use("/api/events", eventsRouter);

  if (options.clientDist) {
    serveClient(app, options.clientDist);
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
