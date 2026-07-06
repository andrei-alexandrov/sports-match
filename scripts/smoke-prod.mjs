// Boots the built production bundle against a throwaway in-memory MongoDB
// and probes it over real HTTP. Proves the deploy artifact actually runs —
// not just that the type-checker passed. Run `npm run build` first.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MongoMemoryServer } from "mongodb-memory-server";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundle = path.join(root, "server", "dist", "index.js");
const clientIndex = path.join(root, "client", "dist", "index.html");
const port = 4123;
const base = `http://127.0.0.1:${port}`;

if (!existsSync(bundle) || !existsSync(clientIndex)) {
  console.error("SMOKE FAIL: build artifacts missing — run `npm run build` first.");
  process.exit(1);
}

const mongod = await MongoMemoryServer.create();
const child = spawn(process.execPath, [bundle], {
  env: {
    ...process.env,
    NODE_ENV: "production",
    MONGO_URL: mongod.getUri(),
    SESSION_SECRET: "smoke-only-secret",
    PORT: String(port),
  },
  stdio: ["ignore", "inherit", "inherit"],
});

function check(condition, label) {
  if (condition) {
    console.log(`SMOKE OK: ${label}`);
  } else {
    throw new Error(label);
  }
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`server exited early with code ${child.exitCode}`);
    }
    try {
      const res = await fetch(`${base}/api/health`);
      if (res.ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("server did not become healthy within 30s");
}

let failed = false;
try {
  await waitForHealth();

  const health = await fetch(`${base}/api/health`);
  const healthBody = await health.json();
  check(health.status === 200 && healthBody.status === "ok", "GET /api/health returns ok");

  const shell = await fetch(`${base}/`);
  const html = await shell.text();
  check(
    shell.status === 200 && html.toLowerCase().includes("<!doctype html"),
    "GET / serves the SPA shell",
  );

  const spaRoute = await fetch(`${base}/buddySearch`);
  const spaHtml = await spaRoute.text();
  check(
    spaRoute.status === 200 && spaHtml.toLowerCase().includes("<!doctype html"),
    "GET /buddySearch falls back to the SPA shell",
  );

  const missing = await fetch(`${base}/api/definitely-not-a-route`);
  const missingBody = await missing.json();
  check(
    missing.status === 404 && missingBody.error?.code === "NOT_FOUND",
    "unknown /api route stays a JSON 404",
  );

  console.log("SMOKE PASS: production bundle boots and serves API + SPA.");
} catch (err) {
  failed = true;
  console.error(`SMOKE FAIL: ${err instanceof Error ? err.message : String(err)}`);
} finally {
  child.kill();
  await mongod.stop();
}
process.exit(failed ? 1 : 0);
