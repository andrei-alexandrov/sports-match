import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app";
import { config } from "./config";
import { connectDb } from "./db";
import { seedPlaces } from "./seed/places";
import { createSessionMiddleware } from "./session";
import { attachSocket } from "./socket";

async function main(): Promise<void> {
  if (!config.mongoUrl) {
    throw new Error("MONGO_URL missing — copy server/.env.example to server/.env and fill it in, or use `npm run dev:memory`");
  }
  if (config.isProduction && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is required in production");
  }
  await connectDb(config.mongoUrl);
  await seedPlaces();
  const sessionMiddleware = createSessionMiddleware();
  // In production this process also serves the built SPA (single origin:
  // session cookies and websockets need no cross-origin setup). The server
  // bundle lives at server/dist/index.js, so the SPA build sits two levels
  // up at client/dist — same depth as src/ in dev, but only production
  // passes clientDist at all.
  const here = path.dirname(fileURLToPath(import.meta.url));
  const clientDist = config.isProduction
    ? path.resolve(here, process.env.CLIENT_DIST ?? "../../client/dist")
    : undefined;
  const app = createApp(sessionMiddleware, { clientDist });
  const server = http.createServer(app);
  attachSocket(server, sessionMiddleware);
  server.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
