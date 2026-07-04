import http from "node:http";
import { createApp } from "./app";
import { config } from "./config";
import { connectDb } from "./db";
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
  const sessionMiddleware = createSessionMiddleware();
  const app = createApp(sessionMiddleware);
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
