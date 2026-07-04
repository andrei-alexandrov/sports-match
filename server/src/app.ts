import express from "express";
import { errorHandler, notFoundHandler } from "./errors";
import { authRouter } from "./routes/auth";
import { messagesRouter } from "./routes/messages";
import { placesRouter } from "./routes/places";
import { usersRouter } from "./routes/users";
import { createSessionMiddleware } from "./session";

export function createApp(
  sessionMiddleware: express.RequestHandler = createSessionMiddleware(),
): express.Express {
  const app = express();
  app.set("trust proxy", 1);
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

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
