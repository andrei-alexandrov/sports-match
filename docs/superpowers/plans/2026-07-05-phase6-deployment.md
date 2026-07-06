# Phase 6 — Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app production-ready on a zero-budget stack: one Node process serves the built SPA + API + websockets, with compression, /api rate limiting, an esbuild server bundle, a smoke check, and a Render + Atlas runbook.

**Architecture:** Single-origin deployment. `createApp` gains an options param: `clientDist` mounts static+SPA-fallback serving (production boot only — dev keeps the Vite proxy), `apiRateLimitMax` makes the always-on /api rate limiter testable. The server ships as one esbuild ESM bundle (`server/dist/index.js`) with `@sports-match/shared` bundled in and node_modules external. `render.yaml` + `DEPLOYMENT.md` cover the human-only steps.

**Tech Stack:** Express 5, `compression`, `express-rate-limit`, esbuild, Render free tier, MongoDB Atlas M0.

**Spec:** `docs/superpowers/specs/2026-07-05-phase6-deployment-design.md`

## Global Constraints

- Node >= 20.19; every workspace is ESM (`"type": "module"`).
- Strict TypeScript, zero `any`. **vitest does NOT type-check** — after code changes, also run `npm run build -w server` (must stay green). After Task 3 that command type-checks AND emits the bundle.
- Error envelope is exactly `{ error: { code, message } }`. New code introduced this phase: `RATE_LIMITED` (HTTP 429).
- Rate limit: `/api` scope only, window 60 000 ms, default max 300 requests/IP; override ONLY via `createApp` options (`apiRateLimitMax`). Always on.
- `compression()` is always on. Static SPA serving ONLY when `options.clientDist` is set (production boot).
- esbuild flags verbatim: `--bundle --platform=node --format=esm --outfile=dist/index.js --packages=external --alias:@sports-match/shared=../shared/src/index.ts` (run with cwd = `server/`).
- Baseline: 146 tests green (41 shared / 78 server / 27 client). Nothing may break: `npm test` from the repo root.
- Commit style: `feat(server): …`, `chore(deploy): …`, `docs: …` — match `git log`.
- Install dependencies with `npm install <pkg> -w server` (workspace-aware); never hand-edit versions into package.json.

---

### Task 1: serveClient (static + SPA fallback) and compression

**Files:**
- Create: `server/src/serveClient.ts`
- Create: `server/tests/fixtures/client-dist/index.html`
- Create: `server/tests/fixtures/client-dist/assets/app.js`
- Modify: `server/src/app.ts`
- Test: `server/tests/serveClient.test.ts`

**Interfaces:**
- Consumes: existing `createApp(sessionMiddleware?)` from `server/src/app.ts`; envelope 404 from `notFoundHandler`.
- Produces: `export interface CreateAppOptions { clientDist?: string }` and `createApp(sessionMiddleware?, options?: CreateAppOptions)` (Task 2 extends the interface; Task 3 passes `clientDist` from `index.ts`); `serveClient(app: express.Express, distPath: string): void`; fixture dir `server/tests/fixtures/client-dist/` whose `index.html` is **> 1024 bytes** (Task 2's gzip test depends on that size).

- [ ] **Step 1: Install dependencies**

```bash
npm install compression -w server
npm install -D @types/compression -w server
```

- [ ] **Step 2: Create the SPA fixture**

`server/tests/fixtures/client-dist/index.html` — the padding lines keep the file above compression's 1 KB threshold; a test asserts the size, so keep all 14 padding lines:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>sports-match-fixture</title>
  </head>
  <body>
    <div id="root">sports-match-fixture shell</div>
    <!--
      Padding: keeps this fixture above compression's 1 KB threshold so the
      hardening suite can assert content-encoding on a realistic response.
      padding padding padding padding padding padding padding padding padding padding
      padding padding padding padding padding padding padding padding padding padding
      padding padding padding padding padding padding padding padding padding padding
      padding padding padding padding padding padding padding padding padding padding
      padding padding padding padding padding padding padding padding padding padding
      padding padding padding padding padding padding padding padding padding padding
      padding padding padding padding padding padding padding padding padding padding
      padding padding padding padding padding padding padding padding padding padding
      padding padding padding padding padding padding padding padding padding padding
      padding padding padding padding padding padding padding padding padding padding
      padding padding padding padding padding padding padding padding padding padding
      padding padding padding padding padding padding padding padding padding padding
      padding padding padding padding padding padding padding padding padding padding
      padding padding padding padding padding padding padding padding padding padding
    -->
  </body>
</html>
```

`server/tests/fixtures/client-dist/assets/app.js`:

```js
console.log("fixture-asset");
```

- [ ] **Step 3: Write the failing tests**

`server/tests/serveClient.test.ts`:

```ts
import { fileURLToPath } from "node:url";
import type { RequestHandler } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

// No DB needed: a pass-through session keeps MongoStore out of these tests.
const noSession: RequestHandler = (_req, _res, next) => next();
const fixtureDist = fileURLToPath(new URL("./fixtures/client-dist", import.meta.url));

const spaApp = () => createApp(noSession, { clientDist: fixtureDist });

describe("serveClient", () => {
  it("serves static assets from the dist dir", async () => {
    const res = await request(spaApp()).get("/assets/app.js");
    expect(res.status).toBe(200);
    expect(res.text).toContain("fixture-asset");
  });

  it("serves index.html at the root", async () => {
    const res = await request(spaApp()).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("sports-match-fixture");
    // Deliberately > 1 KB: the hardening suite relies on this fixture
    // clearing compression's size threshold.
    expect(res.text.length).toBeGreaterThan(1024);
  });

  it("falls back to index.html for client-side routes", async () => {
    const res = await request(spaApp()).get("/buddySearch");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.text).toContain("sports-match-fixture");
  });

  it("falls back for nested client-side routes too", async () => {
    const res = await request(spaApp()).get("/events/nested/route");
    expect(res.status).toBe(200);
    expect(res.text).toContain("sports-match-fixture");
  });

  it("keeps unknown /api routes as JSON 404s", async () => {
    const res = await request(spaApp()).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: "NOT_FOUND", message: "Route not found" } });
  });

  it("does not swallow /socket.io paths", async () => {
    const res = await request(spaApp()).get("/socket.io/?EIO=4");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("does not swallow non-GET requests", async () => {
    const res = await request(spaApp()).post("/buddySearch");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("stays out of the way when clientDist is not set (dev behavior)", async () => {
    const res = await request(createApp(noSession)).get("/buddySearch");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx vitest run tests/serveClient.test.ts` (cwd `server/`)
Expected: FAIL — `createApp` does not accept a second argument / SPA routes return JSON 404.

- [ ] **Step 5: Implement**

`server/src/serveClient.ts` (new file, complete):

```ts
import path from "node:path";
import express from "express";

const PASS_THROUGH_PREFIXES = ["/api", "/socket.io"];

function isReservedPath(pathname: string): boolean {
  return PASS_THROUGH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Serves the built SPA next to the API: static assets first, then an
 * index.html fallback so client-side routes survive a hard refresh.
 * Must be registered before the JSON 404/error handlers; API and socket
 * paths fall through to them untouched.
 */
export function serveClient(app: express.Express, distPath: string): void {
  const indexFile = path.resolve(distPath, "index.html");
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method !== "GET" || isReservedPath(req.path)) {
      next();
      return;
    }
    res.sendFile(indexFile);
  });
}
```

`server/src/app.ts` (complete new content):

```ts
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
```

- [ ] **Step 6: Run tests to verify they pass**

Run (cwd `server/`): `npx vitest run tests/serveClient.test.ts`
Expected: 8 passed.

- [ ] **Step 7: Full server suite + type check**

Run (cwd `server/`): `npx vitest run` then `npm run build -w server` (from root).
Expected: 78 existing + 8 new = 86 server tests passing; tsc green. (compression is now global — existing tests must be unaffected; small JSON bodies sit under the 1 KB threshold.)

- [ ] **Step 8: Commit**

```bash
git add server/src/serveClient.ts server/src/app.ts server/tests/serveClient.test.ts server/tests/fixtures server/package.json package-lock.json
git commit -m "feat(server): serve built SPA with fallback via createApp option; enable compression"
```

---

### Task 2: /api rate limiting

**Files:**
- Modify: `server/src/app.ts`
- Test: `server/tests/hardening.test.ts`

**Interfaces:**
- Consumes: `CreateAppOptions` and the fixture dir `server/tests/fixtures/client-dist/` from Task 1 (index.html > 1 KB).
- Produces: `CreateAppOptions` gains `apiRateLimitMax?: number` (window is fixed at 60 000 ms); 429 envelope `{ error: { code: "RATE_LIMITED", message: string } }`.

- [ ] **Step 1: Install dependency**

```bash
npm install express-rate-limit -w server
```

(Ships its own types — no `@types` package.)

- [ ] **Step 2: Write the failing tests**

`server/tests/hardening.test.ts`:

```ts
import { fileURLToPath } from "node:url";
import type { RequestHandler } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

// No DB needed: a pass-through session keeps MongoStore out of these tests.
const noSession: RequestHandler = (_req, _res, next) => next();
const fixtureDist = fileURLToPath(new URL("./fixtures/client-dist", import.meta.url));

describe("/api rate limiting", () => {
  it("responds 429 with the RATE_LIMITED envelope once the budget is spent", async () => {
    const app = createApp(noSession, { apiRateLimitMax: 3 });
    for (let i = 0; i < 3; i += 1) {
      const ok = await request(app).get("/api/health");
      expect(ok.status).toBe(200);
    }
    const blocked = await request(app).get("/api/health");
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe("RATE_LIMITED");
    expect(typeof blocked.body.error.message).toBe("string");
  });

  it("limits only /api — the SPA keeps serving after the budget is spent", async () => {
    const app = createApp(noSession, { apiRateLimitMax: 1, clientDist: fixtureDist });
    const ok = await request(app).get("/api/health");
    expect(ok.status).toBe(200);
    const blocked = await request(app).get("/api/health");
    expect(blocked.status).toBe(429);
    const page = await request(app).get("/buddySearch");
    expect(page.status).toBe(200);
    expect(page.text).toContain("sports-match-fixture");
  });
});

describe("compression", () => {
  it("gzips bodies over the threshold when the client accepts gzip", async () => {
    const app = createApp(noSession, { clientDist: fixtureDist });
    const res = await request(app).get("/").set("Accept-Encoding", "gzip");
    expect(res.status).toBe(200);
    expect(res.headers["content-encoding"]).toBe("gzip");
    // supertest decompresses transparently; the body must still be intact.
    expect(res.text).toContain("sports-match-fixture");
  });
});
```

- [ ] **Step 3: Run tests to verify the rate-limit ones fail**

Run (cwd `server/`): `npx vitest run tests/hardening.test.ts`
Expected: the two rate-limit tests FAIL (no 429); the compression test already PASSES (Task 1 added compression) — that is fine, it pins the behavior.

- [ ] **Step 4: Implement**

In `server/src/app.ts`, add the import, extend the interface, and mount the limiter immediately after `compression()` (before body parsing, so blocked requests do no work):

```ts
import compression from "compression";
import express from "express";
import { rateLimit } from "express-rate-limit";
```

```ts
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
```

Inside `createApp`, after `app.use(compression());`:

```ts
  app.use(
    "/api",
    rateLimit({
      windowMs: RATE_LIMIT_WINDOW_MS,
      limit: options.apiRateLimitMax ?? RATE_LIMIT_DEFAULT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req, res) => {
        res
          .status(429)
          .json({ error: { code: "RATE_LIMITED", message: "Too many requests — please slow down" } });
      },
    }),
  );
```

- [ ] **Step 5: Run tests to verify they pass**

Run (cwd `server/`): `npx vitest run tests/hardening.test.ts`
Expected: 3 passed.

- [ ] **Step 6: Full server suite + type check**

Run (cwd `server/`): `npx vitest run`, then from root: `npm run build -w server`.
Expected: 89 server tests passing (86 + 3), tsc green. The default of 300/min is far above any suite's request count, so no existing test may hit the limiter — if one does, STOP and report BLOCKED (do not raise the default).

- [ ] **Step 7: Commit**

```bash
git add server/src/app.ts server/tests/hardening.test.ts server/package.json package-lock.json
git commit -m "feat(server): rate-limit /api with envelope 429 (default 300/min, testable via createApp options)"
```

---

### Task 3: Production build pipeline + smoke script

**Files:**
- Modify: `server/src/index.ts`
- Modify: `server/package.json` (build script, esbuild devDependency)
- Modify: `package.json` (root — `start`, `smoke` scripts)
- Create: `scripts/smoke-prod.mjs`

**Interfaces:**
- Consumes: `createApp(sessionMiddleware, { clientDist })` from Task 1; config `{ port, mongoUrl, isProduction }` from `server/src/config.ts`.
- Produces: `server/dist/index.js` (ESM bundle, run via root `npm run start`); root `npm run smoke`; `CLIENT_DIST` env override. Task 4's docs reference `npm run start` / `npm run smoke` verbatim.

- [ ] **Step 1: Install esbuild**

```bash
npm install -D esbuild -w server
```

- [ ] **Step 2: Wire clientDist into the production boot**

`server/src/index.ts` (complete new content):

```ts
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
```

- [ ] **Step 3: Emit a real build**

`server/package.json` — replace the `build` script (exact flags; cwd is `server/` when npm runs workspace scripts):

```json
"build": "tsc --noEmit && esbuild src/index.ts --bundle --platform=node --format=esm --outfile=dist/index.js --packages=external --alias:@sports-match/shared=../shared/src/index.ts"
```

Root `package.json` — add to `scripts`:

```json
"start": "node server/dist/index.js",
"smoke": "node scripts/smoke-prod.mjs"
```

Check `.gitignore` covers `dist/`; if not, add the line `dist/`.

- [ ] **Step 4: Write the smoke script**

`scripts/smoke-prod.mjs` (new file, complete). Note: `mongodb-memory-server` is a server-workspace devDependency; npm hoists it to the root `node_modules`, which is what makes this root-level import resolve.

```js
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
```

- [ ] **Step 5: Verify the pipeline end to end**

From the repo root:

Run: `npm run build`
Expected: shared type-check, server type-check + `server/dist/index.js` emitted, client Vite build into `client/dist/`.

Run: `npm run smoke`
Expected output ends with `SMOKE PASS: production bundle boots and serves API + SPA.` and exit code 0.

Run: `npm test`
Expected: all suites green (41 shared / 89 server / 27 client).

- [ ] **Step 6: Commit**

```bash
git add server/src/index.ts server/package.json package.json package-lock.json scripts/smoke-prod.mjs
git commit -m "feat(deploy): esbuild server bundle, prod SPA wiring, root start + smoke scripts"
```

---

### Task 4: render.yaml, DEPLOYMENT.md, README

**Files:**
- Create: `render.yaml`
- Create: `DEPLOYMENT.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: root scripts `npm run build` / `npm run start` / `npm run smoke` (Task 3); `/api/health`; env vars `NODE_ENV`, `MONGO_URL`, `SESSION_SECRET`, `PORT` (Render injects `PORT`).
- Produces: deploy artifacts only — no code.

- [ ] **Step 1: Create render.yaml**

`render.yaml` (repo root, complete):

```yaml
services:
  - type: web
    name: sports-match
    runtime: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm run start
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: SESSION_SECRET
        generateValue: true
      - key: MONGO_URL
        sync: false
```

- [ ] **Step 2: Create DEPLOYMENT.md**

`DEPLOYMENT.md` (repo root, complete):

```markdown
# Deploying Sports Match

One Render web service runs everything: the Express API, Socket.io
websockets, and the built React app — a single origin, so session cookies
and websockets need no special configuration. Data lives in a free
MongoDB Atlas cluster.

Total cost: $0. Total time: ~15 minutes.

## 1. Create the database (MongoDB Atlas, free M0)

1. Sign up / log in at <https://www.mongodb.com/cloud/atlas>.
2. Create a project, then **Build a Database** → choose the **M0 (Free)**
   tier. Pick a region close to your Render region (e.g. Frankfurt).
3. **Database Access** → *Add New Database User* → password
   authentication, a username and a strong password, role
   **Read and write to any database**.
4. **Network Access** → *Add IP Address* → **Allow access from anywhere
   (0.0.0.0/0)**. Render's free tier has no static outbound IPs, so
   per-IP allowlisting is not possible; the strong DB password is the
   access control.
5. **Clusters** → *Connect* → *Drivers* → copy the connection string:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/…`
6. Put the database name `sports-match` into the path, keeping the query
   string:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/sports-match?retryWrites=true&w=majority`

## 2. Deploy the app (Render, free)

1. Sign up at <https://render.com> (easiest: log in with GitHub).
2. **New** → **Blueprint** → select this repository. Render reads
   `render.yaml` and proposes one free web service.
3. When prompted for environment variables, paste the Atlas connection
   string (step 1.6) into **MONGO_URL**. `SESSION_SECRET` is generated
   automatically; `NODE_ENV` is preset.
4. **Apply**. The first build takes a few minutes: it installs, builds
   shared/server/client, boots, and self-seeds the 54 Sofia venues on
   first connect.

## 3. Verify

- `https://<service>.onrender.com/api/health` → `{"status":"ok"}`
- Open the root URL, register a user, fill in the profile.
- **Places**: filters work and "Near me" asks for location (54 seeded
  venues).
- Open a second browser (or a private window), register another user,
  and chat between the two — messages appear live over websockets.
- **Events**: create one, join/leave it with the second user.

## Known free-tier limits

- Render free instances spin down after ~15 minutes idle; the next
  request takes ~30–60 s while the instance boots. Fine for a demo/beta.
- Rate-limit counters live in process memory and reset on every
  restart/deploy — fine at this scale.
- Atlas M0 caps storage at 512 MB and may pause after long inactivity.

## Local production rehearsal

    npm run build && npm run smoke

Builds everything, then boots the real production bundle against a
throwaway in-memory MongoDB and probes `/api/health`, the SPA shell, and
a JSON 404.

## Configuration reference

| Variable         | Required          | Purpose                                            |
| ---------------- | ----------------- | -------------------------------------------------- |
| `NODE_ENV`       | yes (production)  | Enables secure cookies + SPA serving               |
| `MONGO_URL`      | yes               | Atlas connection string (with `/sports-match` db)  |
| `SESSION_SECRET` | yes (production)  | Session cookie signing key                         |
| `PORT`           | injected by host  | Listen port (defaults to 4000 locally)             |
| `CLIENT_DIST`    | no                | Override the SPA build path (default `client/dist`)|
```

- [ ] **Step 3: Update README.md**

Three edits:

1. In the **Status** paragraph, replace the first sentence fragment so it reads:

```markdown
**Status:** rebuilt from scratch as a full-stack TypeScript app — auth +
profiles, activities + buddy search, real-time chat, the places
catalogue, and events are all live, and the app is deployable to Render
(see [DEPLOYMENT.md](DEPLOYMENT.md)). The original 2023 prototype lives
on the [`prototype`](../../tree/prototype) branch.
```

2. In **Scripts**, replace the `npm run build` line and add two lines so the list reads:

```markdown
- `npm run dev` — client (:3000) + server (:4000), real database
- `npm run dev:memory` — same, with in-memory MongoDB
- `npm test` — all workspace test suites
- `npm run build` — typecheck everything + production bundles (server + client)
- `npm run start` — run the production build (needs `NODE_ENV=production`, `MONGO_URL`, `SESSION_SECRET`)
- `npm run smoke` — boot the production build against an in-memory MongoDB and probe it
```

3. Add a **Deploying** section between **Scripts** and **Roadmap**, and check off roadmap item 6:

```markdown
## Deploying

One free Render web service + one free MongoDB Atlas cluster.
[DEPLOYMENT.md](DEPLOYMENT.md) walks through it click by click
(~15 minutes, $0).
```

```markdown
6. ✅ Deployment
```

- [ ] **Step 4: Verify**

- `npx yaml-lint render.yaml` is NOT a project dependency — instead validate by eye against the complete file above, then run `node -e "console.log(require('node:fs').readFileSync('render.yaml','utf8').includes('healthCheckPath: /api/health'))"` → `true`.
- Every script name referenced in DEPLOYMENT.md and README exists in the root `package.json` (`build`, `start`, `smoke`, `dev`, `dev:memory`, `test`).
- README renders: links point at `DEPLOYMENT.md` (repo root).

- [ ] **Step 5: Commit**

```bash
git add render.yaml DEPLOYMENT.md README.md
git commit -m "docs(deploy): render blueprint, deployment runbook, README deploy section"
```
