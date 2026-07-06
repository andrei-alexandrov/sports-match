import compression from "compression";
import express from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
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
  /** Requests allowed per IP per minute on /api routes. Tests lower it
   *  to assert 429s; production uses the default. */
  apiRateLimitMax?: number;
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_DEFAULT_MAX = 300;

export function createApp(
  sessionMiddleware: express.RequestHandler = createSessionMiddleware(),
  options: CreateAppOptions = {},
): express.Express {
  const app = express();
  app.set("trust proxy", 1);
  app.use(compression());
  app.use(
    "/api",
    rateLimit({
      windowMs: RATE_LIMIT_WINDOW_MS,
      limit: options.apiRateLimitMax ?? RATE_LIMIT_DEFAULT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      // Render fronts services with Cloudflare, so req.ip resolves to an
      // internal router shared by all clients. The edge sets these headers
      // with the real client IP; instances are not directly reachable, so
      // they cannot be spoofed there. Elsewhere (local, tests) they are
      // absent and the socket address is used.
      keyGenerator: (req) => {
        const edgeHeader = req.headers["true-client-ip"] ?? req.headers["cf-connecting-ip"];
        const edgeIp = Array.isArray(edgeHeader) ? edgeHeader[0] : edgeHeader;
        return ipKeyGenerator(edgeIp && edgeIp.length > 0 ? edgeIp : (req.ip ?? ""));
      },
      handler: (_req, res) => {
        res
          .status(429)
          .json({ error: { code: "RATE_LIMITED", message: "Too many requests — please slow down" } });
      },
    }),
  );
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
