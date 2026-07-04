# Phase 1 — Walking Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild sports-match as a full-stack TypeScript monorepo with real session auth — register → login → edit profile working end-to-end against MongoDB.

**Architecture:** npm-workspaces monorepo: `client/` (React 18 + Vite SPA), `server/` (Express 5 + Mongoose + session cookies), `shared/` (Zod schemas both sides import). The old prototype is preserved on a `prototype` branch; its UI (SCSS/images/pages) is ported, its localStorage "services" are replaced by the real API. Spec: `docs/superpowers/specs/2026-07-04-fullstack-rebuild-design.md`.

**Tech Stack:** TypeScript (strict), React 18, Vite 7, react-router-dom 7, react-bootstrap/Bootstrap 5, sass, sweetalert2, Express 5, Mongoose 8, express-session + connect-mongo, bcryptjs, Zod 4, Vitest 3, supertest, mongodb-memory-server.

## Global Constraints

- Node >= 20.19 (machine has v24.17.0). npm workspaces (npm >= 9).
- TypeScript `strict: true` everywhere; **zero `any`** (casts must be `as unknown as T` with a comment when bridging package nominal types).
- API error envelope, always: `{ error: { code: string, message: string } }`.
- Session cookie: `httpOnly: true`, `sameSite: "lax"`, `secure` in production only; store in MongoDB via connect-mongo; bcrypt cost 10.
- Visual identity is ported, not redesigned: keep the prototype's classNames, JSX structure, and SCSS byte-identical except where this plan explicitly says otherwise.
- All commands below run from the repo root `c:\Users\andre\Desktop\sports-match` in Git Bash unless a `cd` is shown.
- Commit after every task with the message given in the task.
- `npm run dev` may be verified with `npm run dev:memory` (in-memory MongoDB) — no Atlas account needed until final verification.
- First `vitest run` in `server/` downloads a ~70 MB MongoDB binary (mongodb-memory-server) — one-time, may take a few minutes.

---

### Task 1: Prototype branch + monorepo root

**Files:**
- Create: `package.json` (replaces CRA one), `.gitignore` (replaces CRA one), `shared/package.json`, `server/package.json`, `client/package.json` (stubs)
- Delete from `main`: `src/`, `public/`, `package-lock.json`, `projectBackgroundWithoutBackground.png`, `bash.exe.stackdump`; untracked: `node_modules/`, `sports-match/` (stale 2023 nested clone)
- Keep: `README.md` (rewritten in Task 12), `docs/`

**Interfaces:**
- Produces: `prototype` git branch (source for all `git checkout prototype -- <path>` port commands in Tasks 7–11); workspace names `@sports-match/shared`, `@sports-match/server`, `@sports-match/client`; root scripts `dev`, `dev:memory`, `test`, `build`.

- [ ] **Step 1: Create the prototype branch (do not switch to it)**

```bash
git branch prototype
git push -u origin prototype
```
Expected: `branch 'prototype' set up to track 'origin/prototype'`. If the push fails for credentials, continue — the local branch is what later tasks need; push manually later.

- [ ] **Step 2: Remove prototype files from main**

```bash
git rm -r -q src public
git rm -q package.json package-lock.json projectBackgroundWithoutBackground.png bash.exe.stackdump
rm -rf node_modules sports-match
```
Expected: `git status` shows deletions staged; `sports-match/` and `node_modules/` gone from disk.

- [ ] **Step 3: Write root `package.json`**

```json
{
  "name": "sports-match",
  "version": "0.1.0",
  "private": true,
  "workspaces": ["shared", "server", "client"],
  "engines": { "node": ">=20.19" },
  "scripts": {
    "dev": "concurrently -n server,client -c blue,green \"npm run dev -w server\" \"npm run dev -w client\"",
    "dev:memory": "concurrently -n server,client -c blue,green \"npm run dev:memory -w server\" \"npm run dev -w client\"",
    "test": "npm test -w shared -w server -w client --if-present",
    "build": "npm run build -w shared -w server -w client --if-present"
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

- [ ] **Step 4: Write root `.gitignore`**

```gitignore
node_modules/
dist/
coverage/
.env
.env.*.local
*.log
.DS_Store
```

- [ ] **Step 5: Write the three workspace stubs**

`shared/package.json`:
```json
{ "name": "@sports-match/shared", "version": "0.1.0", "private": true, "main": "src/index.ts", "types": "src/index.ts" }
```
`server/package.json`:
```json
{ "name": "@sports-match/server", "version": "0.1.0", "private": true, "type": "module" }
```
`client/package.json`:
```json
{ "name": "@sports-match/client", "version": "0.1.0", "private": true, "type": "module" }
```

- [ ] **Step 6: Install and verify workspaces resolve**

```bash
npm install
npm ls --workspaces
```
Expected: no errors; the three `@sports-match/*` workspaces listed. A new root `package-lock.json` is generated.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: preserve prototype on branch, scaffold npm-workspaces monorepo root"
```

---

### Task 2: `shared/` — Zod schemas both sides import

**Files:**
- Create: `shared/tsconfig.json`, `shared/src/schemas.ts`, `shared/src/index.ts`
- Test: `shared/src/schemas.test.ts`
- Modify: `shared/package.json`

**Interfaces:**
- Produces (imported as `@sports-match/shared` by server Tasks 4–6 and client Tasks 8–11):
  - `registerInputSchema`, `loginInputSchema`, `updateProfileInputSchema`, `publicUserSchema` (Zod schemas)
  - Types: `RegisterInput { username: string; password: string }`, `LoginInput { username: string; password: string }`, `UpdateProfileInput { age?: number | null; city?: string; gender?: "male" | "female" | "other" | ""; image?: string }`, `PublicUser { id: string; username: string; age: number | null; city: string; gender: "male" | "female" | "other" | ""; image: string; activities: string[] }`, `ApiErrorBody { error: { code: string; message: string } }`
- The validation rules and messages are lifted verbatim from the prototype's `RegistrationForm.js` so the ported UI shows identical errors.

- [ ] **Step 1: Flesh out `shared/package.json`**

```json
{
  "name": "@sports-match/shared",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "test": "vitest run",
    "build": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "typescript": "^5.8.0",
    "vitest": "^3.2.0"
  }
}
```
Run: `npm install` (from root). Expected: success.

- [ ] **Step 2: Write `shared/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Write the failing test `shared/src/schemas.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import {
  loginInputSchema,
  publicUserSchema,
  registerInputSchema,
  updateProfileInputSchema,
} from "./schemas";

describe("registerInputSchema", () => {
  it("accepts a valid username and password", () => {
    const result = registerInputSchema.safeParse({ username: "andrei", password: "Secret1" });
    expect(result.success).toBe(true);
  });

  it("rejects usernames shorter than 3 characters with the prototype's message", () => {
    const result = registerInputSchema.safeParse({ username: "ab", password: "Secret1" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Username must be at least 3 characters long");
    }
  });

  it("rejects usernames that do not start with a letter", () => {
    for (const username of ["1abc", "_abc"]) {
      const result = registerInputSchema.safeParse({ username, password: "Secret1" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Username must start with a letter");
      }
    }
  });

  it("rejects passwords missing a number or an uppercase letter", () => {
    expect(registerInputSchema.safeParse({ username: "andrei", password: "Secrets" }).success).toBe(false);
    expect(registerInputSchema.safeParse({ username: "andrei", password: "secret1" }).success).toBe(false);
    expect(registerInputSchema.safeParse({ username: "andrei", password: "Se1" }).success).toBe(false);
  });
});

describe("loginInputSchema", () => {
  it("requires both fields non-empty", () => {
    expect(loginInputSchema.safeParse({ username: "", password: "x" }).success).toBe(false);
    expect(loginInputSchema.safeParse({ username: "a", password: "b" }).success).toBe(true);
  });
});

describe("updateProfileInputSchema", () => {
  it("accepts a partial update", () => {
    const result = updateProfileInputSchema.safeParse({ city: "Sofia" });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ city: "Sofia" });
  });

  it("strips unknown keys (mass-assignment protection)", () => {
    const result = updateProfileInputSchema.safeParse({ city: "Sofia", activities: ["hacked"] });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ city: "Sofia" });
  });

  it("rejects ages outside 0-100", () => {
    expect(updateProfileInputSchema.safeParse({ age: 150 }).success).toBe(false);
    expect(updateProfileInputSchema.safeParse({ age: -1 }).success).toBe(false);
    expect(updateProfileInputSchema.safeParse({ age: 30 }).success).toBe(true);
  });
});

describe("publicUserSchema", () => {
  it("describes the public user shape (no password fields)", () => {
    const user = {
      id: "abc123",
      username: "andrei",
      age: null,
      city: "",
      gender: "" as const,
      image: "",
      activities: [],
    };
    expect(publicUserSchema.safeParse(user).success).toBe(true);
    const withHash = publicUserSchema.safeParse({ ...user, passwordHash: "x" });
    expect(withHash.success).toBe(true);
    if (withHash.success) {
      expect(withHash.data).not.toHaveProperty("passwordHash");
    }
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -w shared`
Expected: FAIL — `Cannot find module './schemas'` (or similar resolution error).

- [ ] **Step 5: Write `shared/src/schemas.ts`**

```ts
import { z } from "zod";

export const registerInputSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters long")
    .regex(/^[a-zA-Z]/, "Username must start with a letter"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long")
    .regex(/\d/, "Password must contain at least one number")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter"),
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const genderSchema = z.enum(["male", "female", "other"]).or(z.literal(""));
export type Gender = z.infer<typeof genderSchema>;

export const updateProfileInputSchema = z.object({
  age: z.number().int().min(0).max(100).nullable().optional(),
  city: z.string().max(100).optional(),
  gender: genderSchema.optional(),
  // Profile pictures travel as data URLs for now (prototype parity); real upload is a follow-up.
  image: z.string().max(2_000_000).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;

export const publicUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  age: z.number().int().nullable(),
  city: z.string(),
  gender: genderSchema,
  image: z.string(),
  activities: z.array(z.string()),
});
export type PublicUser = z.infer<typeof publicUserSchema>;

export interface ApiErrorBody {
  error: { code: string; message: string };
}
```

And `shared/src/index.ts`:

```ts
export * from "./schemas";
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -w shared`
Expected: PASS — all tests green.

- [ ] **Step 7: Typecheck and commit**

```bash
npm run build -w shared
git add shared package-lock.json
git commit -m "feat(shared): zod schemas for auth, profile, and public user contract"
```

---

### Task 3: Server scaffold — Express app factory, config, health check

**Files:**
- Create: `server/tsconfig.json`, `server/vitest.config.ts`, `server/.env.example`, `server/src/config.ts`, `server/src/errors.ts`, `server/src/db.ts`, `server/src/app.ts`, `server/src/index.ts`, `server/src/types/express-session.d.ts`
- Test: `server/tests/helpers.ts`, `server/tests/health.test.ts`
- Modify: `server/package.json`

**Interfaces:**
- Consumes: nothing yet (shared arrives in Task 4's routes).
- Produces: `createApp(): express.Express` (Tasks 4–6 add routers inside it); `AppError(status, code, message)` class; `errorHandler`/`notFoundHandler` middleware; `setupTestDb()` test helper (used by every server test file); `config` object `{ port: number; mongoUrl: string; sessionSecret: string; isProduction: boolean }`; `req.session.userId?: string` via declaration merging.

- [ ] **Step 1: Flesh out `server/package.json`**

```json
{
  "name": "@sports-match/server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "test": "vitest run",
    "build": "tsc --noEmit"
  },
  "dependencies": {
    "@sports-match/shared": "*",
    "bcryptjs": "^3.0.2",
    "connect-mongo": "^5.1.0",
    "dotenv": "^16.4.5",
    "express": "^5.1.0",
    "express-session": "^1.18.1",
    "mongoose": "^8.16.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/express-session": "^1.18.0",
    "@types/node": "^24.0.0",
    "@types/supertest": "^6.0.0",
    "mongodb-memory-server": "^10.1.0",
    "supertest": "^7.1.0",
    "tsx": "^4.20.0",
    "typescript": "^5.8.0",
    "vitest": "^3.2.0"
  }
}
```
Run: `npm install` (from root). Expected: success.

- [ ] **Step 2: Write `server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["node"],
    "baseUrl": ".",
    "paths": {
      "@sports-match/shared": ["../shared/src/index.ts"]
    }
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Write `server/vitest.config.ts`**

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Point at shared source so vitest transforms it like our own code.
      "@sports-match/shared": fileURLToPath(new URL("../shared/src/index.ts", import.meta.url)),
    },
  },
  test: { environment: "node" },
});
```

- [ ] **Step 4: Write `server/.env.example`**

```env
# MongoDB connection string. For MongoDB Atlas (recommended):
#   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/sports-match
# Not needed for `npm run dev:memory` or for tests.
MONGO_URL=
# Any long random string. Required in production; a dev fallback exists.
SESSION_SECRET=
PORT=4000
```

- [ ] **Step 5: Write config, errors, db, session typing**

`server/src/config.ts`:
```ts
import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  mongoUrl: process.env.MONGO_URL ?? "",
  sessionSecret: process.env.SESSION_SECRET ?? "dev-secret-change-me",
  isProduction: process.env.NODE_ENV === "production",
};
```

`server/src/errors.ts`:
```ts
import type { NextFunction, Request, Response } from "express";

export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  // Mongo duplicate-key race (two simultaneous registers with one username).
  if (typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === 11000) {
    res.status(409).json({ error: { code: "USERNAME_TAKEN", message: "Username already exists" } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL", message: "Something went wrong" } });
}
```

`server/src/db.ts`:
```ts
import mongoose from "mongoose";

export async function connectDb(mongoUrl: string): Promise<void> {
  await mongoose.connect(mongoUrl);
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
```

`server/src/types/express-session.d.ts`:
```ts
import "express-session";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}
```

- [ ] **Step 6: Write `server/src/app.ts` and `server/src/index.ts`**

`server/src/app.ts` — the factory pattern (create the app without listening) is what makes supertest work:
```ts
import MongoStore from "connect-mongo";
import express from "express";
import session from "express-session";
import type { MongoClient } from "mongodb";
import mongoose from "mongoose";
import { config } from "./config";
import { errorHandler, notFoundHandler } from "./errors";

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

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
```

`server/src/index.ts`:
```ts
import { createApp } from "./app";
import { config } from "./config";
import { connectDb } from "./db";

async function main(): Promise<void> {
  if (!config.mongoUrl) {
    throw new Error("MONGO_URL missing — copy server/.env.example to server/.env and fill it in, or use `npm run dev:memory`");
  }
  if (config.isProduction && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is required in production");
  }
  await connectDb(config.mongoUrl);
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 7: Write the failing test — helper + health check**

`server/tests/helpers.ts`:
```ts
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach } from "vitest";

/** Boots an in-memory MongoDB for the suite; wipes data between tests. */
export function setupTestDb(): void {
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  });

  beforeEach(async () => {
    await mongoose.connection.db!.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });
}
```

`server/tests/health.test.ts`:
```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { setupTestDb } from "./helpers";

setupTestDb();

describe("GET /api/health", () => {
  it("returns ok", async () => {
    const res = await request(createApp()).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("returns the error envelope for unknown routes", async () => {
    const res = await request(createApp()).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: "NOT_FOUND", message: "Route not found" } });
  });
});
```

- [ ] **Step 8: Run tests**

Run: `npm test -w server`
Expected: PASS (first run downloads the MongoDB binary — allow a few minutes). This scaffold task co-writes the harness and the app factory; from Task 4 on, every task is strictly test-first.

- [ ] **Step 9: Typecheck and commit**

```bash
npm run build -w server
git add server package-lock.json
git commit -m "feat(server): express 5 scaffold with session store, error envelope, health check"
```

---

### Task 4: User model + POST /api/auth/register

**Files:**
- Create: `server/src/models/User.ts`, `server/src/middleware/validate.ts`, `server/src/routes/auth.ts`
- Modify: `server/src/app.ts` (mount router)
- Test: `server/tests/auth.register.test.ts`

**Interfaces:**
- Consumes: `registerInputSchema`, `RegisterInput`, `PublicUser` from `@sports-match/shared`; `AppError`, `createApp`, `setupTestDb` from Task 3.
- Produces: `User` mongoose model with fields `UserFields { username: string; passwordHash: string; age: number | null; city: string; gender: "male" | "female" | "other" | ""; image: string; activities: string[] }`; `toPublicUser(user): PublicUser`; `validate(schema)` middleware; `authRouter` mounted at `/api/auth`; `regenerateSession(req): Promise<void>`.
- Register semantics: creating an account **also logs the user in** (session set) — the client redirects straight to home.

- [ ] **Step 1: Write the failing test `server/tests/auth.register.test.ts`**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { User } from "../src/models/User";
import { setupTestDb } from "./helpers";

setupTestDb();

const valid = { username: "andrei", password: "Secret1" };

describe("POST /api/auth/register", () => {
  it("creates the user, starts a session, and returns the public user", async () => {
    const res = await request(createApp()).post("/api/auth/register").send(valid);
    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({
      id: expect.any(String),
      username: "andrei",
      age: null,
      city: "",
      gender: "",
      image: "",
      activities: [],
    });
    expect(res.headers["set-cookie"]?.[0]).toContain("HttpOnly");
  });

  it("stores a bcrypt hash, never the plaintext password", async () => {
    await request(createApp()).post("/api/auth/register").send(valid);
    const user = await User.findOne({ username: "andrei" });
    expect(user?.passwordHash).not.toBe(valid.password);
    expect(user?.passwordHash).toMatch(/^\$2/);
  });

  it("rejects a duplicate username with 409 USERNAME_TAKEN", async () => {
    const app = createApp();
    await request(app).post("/api/auth/register").send(valid);
    const res = await request(app).post("/api/auth/register").send(valid);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("USERNAME_TAKEN");
  });

  it("rejects invalid input with 400 VALIDATION_ERROR and the shared message", async () => {
    const res = await request(createApp())
      .post("/api/auth/register")
      .send({ username: "ab", password: "Secret1" });
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual({
      code: "VALIDATION_ERROR",
      message: "Username must be at least 3 characters long",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w server`
Expected: FAIL — cannot find `../src/models/User` / 404 on the route.

- [ ] **Step 3: Write model, validate middleware, and route**

`server/src/models/User.ts`:
```ts
import type { PublicUser } from "@sports-match/shared";
import mongoose, { type HydratedDocument } from "mongoose";

export interface UserFields {
  username: string;
  passwordHash: string;
  age: number | null;
  city: string;
  gender: "male" | "female" | "other" | "";
  image: string;
  activities: string[];
}

const userSchema = new mongoose.Schema<UserFields>({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  age: { type: Number, default: null },
  city: { type: String, default: "" },
  gender: { type: String, default: "" },
  image: { type: String, default: "" },
  activities: { type: [String], default: [] },
});

export const User = mongoose.model<UserFields>("User", userSchema);
export type UserDoc = HydratedDocument<UserFields>;

export function toPublicUser(user: UserDoc): PublicUser {
  return {
    id: user.id as string,
    username: user.username,
    age: user.age,
    city: user.city,
    gender: user.gender,
    image: user.image,
    activities: user.activities,
  };
}
```

`server/src/middleware/validate.ts`:
```ts
import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "../errors";

export function validate(schema: ZodType): (req: Request, res: Response, next: NextFunction) => void {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new AppError(400, "VALIDATION_ERROR", result.error.issues[0]?.message ?? "Invalid input"));
      return;
    }
    req.body = result.data;
    next();
  };
}
```

`server/src/routes/auth.ts`:
```ts
import { registerInputSchema, type RegisterInput } from "@sports-match/shared";
import bcrypt from "bcryptjs";
import { Router, type Request } from "express";
import { AppError } from "../errors";
import { validate } from "../middleware/validate";
import { toPublicUser, User } from "../models/User";

export const authRouter = Router();

/** Session fixation defense: always mint a fresh session id at privilege change. */
export function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
}

authRouter.post("/register", validate(registerInputSchema), async (req, res) => {
  const { username, password } = req.body as RegisterInput;
  const existing = await User.findOne({ username });
  if (existing) {
    throw new AppError(409, "USERNAME_TAKEN", "Username already exists");
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ username, passwordHash });
  await regenerateSession(req);
  req.session.userId = user.id as string;
  res.status(201).json({ user: toPublicUser(user) });
});
```

- [ ] **Step 4: Mount the router in `server/src/app.ts`**

Add the import and mount it **above** `notFoundHandler`:
```ts
import { authRouter } from "./routes/auth";
```
```ts
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -w server`
Expected: PASS — all register tests green (Express 5 forwards thrown async errors to `errorHandler` automatically; no try/catch wrappers needed).

- [ ] **Step 6: Typecheck and commit**

```bash
npm run build -w server
git add server
git commit -m "feat(server): user model and register endpoint with bcrypt + session"
```

---

### Task 5: Login, logout, me + requireAuth middleware

**Files:**
- Create: `server/src/middleware/requireAuth.ts`
- Modify: `server/src/routes/auth.ts`
- Test: `server/tests/auth.session.test.ts`

**Interfaces:**
- Consumes: `loginInputSchema`, `LoginInput` from shared; `regenerateSession`, `authRouter`, `User`, `toPublicUser`, `AppError`, `validate` from Task 4.
- Produces: `requireAuth` middleware (reused by Task 6); endpoints `POST /api/auth/login` → `{ user }`, `POST /api/auth/logout` → 204, `GET /api/auth/me` → `{ user }` or 401 `UNAUTHORIZED`. Login failure is always 401 `INVALID_CREDENTIALS` with message "Invalid username or password" (never reveals which field was wrong).

- [ ] **Step 1: Write the failing test `server/tests/auth.session.test.ts`**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { setupTestDb } from "./helpers";

setupTestDb();

const creds = { username: "andrei", password: "Secret1" };

describe("session lifecycle", () => {
  it("login returns the user and sets a session cookie", async () => {
    const app = createApp();
    await request(app).post("/api/auth/register").send(creds);
    const res = await request(app).post("/api/auth/login").send(creds);
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe("andrei");
    expect(res.headers["set-cookie"]?.[0]).toContain("HttpOnly");
  });

  it("rejects a wrong password and an unknown user identically", async () => {
    const app = createApp();
    await request(app).post("/api/auth/register").send(creds);
    const wrongPassword = await request(app).post("/api/auth/login").send({ ...creds, password: "Nope1x" });
    const unknownUser = await request(app).post("/api/auth/login").send({ username: "ghost", password: "Secret1" });
    for (const res of [wrongPassword, unknownUser]) {
      expect(res.status).toBe(401);
      expect(res.body.error).toEqual({ code: "INVALID_CREDENTIALS", message: "Invalid username or password" });
    }
  });

  it("me returns the logged-in user for a session cookie, 401 without one", async () => {
    const app = createApp();
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send(creds);
    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.username).toBe("andrei");

    const anonymous = await request(app).get("/api/auth/me");
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.error.code).toBe("UNAUTHORIZED");
  });

  it("logout destroys the session", async () => {
    const agent = request.agent(createApp());
    await agent.post("/api/auth/register").send(creds);
    const logout = await agent.post("/api/auth/logout");
    expect(logout.status).toBe(204);
    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w server`
Expected: FAIL — 404 on `/api/auth/login` (route not defined yet).

- [ ] **Step 3: Write `server/src/middleware/requireAuth.ts`**

```ts
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors";

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    next(new AppError(401, "UNAUTHORIZED", "You must be logged in"));
    return;
  }
  next();
}
```

- [ ] **Step 4: Append login/logout/me to `server/src/routes/auth.ts`**

Add imports:
```ts
import { loginInputSchema, registerInputSchema, type LoginInput, type RegisterInput } from "@sports-match/shared";
import { requireAuth } from "../middleware/requireAuth";
```
Append routes:
```ts
authRouter.post("/login", validate(loginInputSchema), async (req, res) => {
  const { username, password } = req.body as LoginInput;
  const user = await User.findOne({ username });
  const valid = user !== null && (await bcrypt.compare(password, user.passwordHash));
  if (!valid || user === null) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid username or password");
  }
  await regenerateSession(req);
  req.session.userId = user.id as string;
  res.json({ user: toPublicUser(user) });
});

authRouter.post("/logout", (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      next(err);
      return;
    }
    res.clearCookie("connect.sid");
    res.status(204).end();
  });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.session.userId);
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "You must be logged in");
  }
  res.json({ user: toPublicUser(user) });
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -w server`
Expected: PASS.

- [ ] **Step 6: Typecheck and commit**

```bash
npm run build -w server
git add server
git commit -m "feat(server): login, logout, me endpoints with requireAuth"
```

---

### Task 6: PATCH /api/users/me — profile update

**Files:**
- Create: `server/src/routes/users.ts`
- Modify: `server/src/app.ts` (mount router)
- Test: `server/tests/users.profile.test.ts`

**Interfaces:**
- Consumes: `updateProfileInputSchema`, `UpdateProfileInput` from shared; `requireAuth`, `validate`, `User`, `toPublicUser`, `AppError` from Tasks 4–5.
- Produces: `usersRouter` mounted at `/api/users`; `PATCH /api/users/me` accepting a partial `UpdateProfileInput`, returning `{ user: PublicUser }`. Only provided fields change; unknown fields (e.g. `activities`, `passwordHash`) are stripped by Zod before reaching Mongo.

- [ ] **Step 1: Write the failing test `server/tests/users.profile.test.ts`**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { User } from "../src/models/User";
import { setupTestDb } from "./helpers";

setupTestDb();

const creds = { username: "andrei", password: "Secret1" };

describe("PATCH /api/users/me", () => {
  it("updates provided fields, persists them, and leaves others untouched", async () => {
    const agent = request.agent(createApp());
    await agent.post("/api/auth/register").send(creds);

    const res = await agent.patch("/api/users/me").send({ age: 30, city: "Sofia", gender: "male" });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ username: "andrei", age: 30, city: "Sofia", gender: "male" });

    const cityOnly = await agent.patch("/api/users/me").send({ city: "Plovdiv" });
    expect(cityOnly.body.user).toMatchObject({ age: 30, city: "Plovdiv" });
  });

  it("cannot mass-assign protected fields like activities or passwordHash", async () => {
    const agent = request.agent(createApp());
    await agent.post("/api/auth/register").send(creds);
    await agent.patch("/api/users/me").send({ city: "Sofia", activities: ["hacked"], passwordHash: "owned" });
    const user = await User.findOne({ username: "andrei" });
    expect(user?.activities).toEqual([]);
    expect(user?.passwordHash).toMatch(/^\$2/);
  });

  it("rejects invalid values with 400", async () => {
    const agent = request.agent(createApp());
    await agent.post("/api/auth/register").send(creds);
    const res = await agent.patch("/api/users/me").send({ age: 150 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("requires authentication", async () => {
    const res = await request(createApp()).patch("/api/users/me").send({ city: "Sofia" });
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w server`
Expected: FAIL — 404 on `/api/users/me`.

- [ ] **Step 3: Write `server/src/routes/users.ts`**

```ts
import { updateProfileInputSchema, type UpdateProfileInput } from "@sports-match/shared";
import { Router } from "express";
import { AppError } from "../errors";
import { requireAuth } from "../middleware/requireAuth";
import { validate } from "../middleware/validate";
import { toPublicUser, User } from "../models/User";

export const usersRouter = Router();

usersRouter.patch("/me", requireAuth, validate(updateProfileInputSchema), async (req, res) => {
  const updates = req.body as UpdateProfileInput;
  const user = await User.findByIdAndUpdate(req.session.userId, { $set: updates }, { new: true });
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "You must be logged in");
  }
  res.json({ user: toPublicUser(user) });
});
```

- [ ] **Step 4: Mount in `server/src/app.ts`**

```ts
import { usersRouter } from "./routes/users";
```
```ts
  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -w server`
Expected: PASS — the server side of the walking skeleton is complete.

- [ ] **Step 6: Typecheck and commit**

```bash
npm run build -w server
git add server
git commit -m "feat(server): profile update endpoint with mass-assignment protection"
```

---

### Task 7: Client scaffold — Vite + ported styles and assets

**Files:**
- Create: `client/vite.config.ts`, `client/tsconfig.json`, `client/index.html`, `client/src/main.tsx`, `client/src/App.tsx` (placeholder), `client/src/vite-env.d.ts`, `client/src/types/ion-icon.d.ts`
- Port from prototype branch (verbatim unless stated): global SCSS, page/component SCSS, used images, favicon, robots.txt
- Modify: `client/package.json`; one-line fix in ported `App.scss`

**Interfaces:**
- Consumes: `prototype` branch (Task 1).
- Produces: running Vite dev server on :3000 proxying `/api` to :4000; SCSS/asset tree under `client/src/` with the prototype's exact relative layout (so ported pages' relative imports keep working); `ion-icon` usable in TSX.

- [ ] **Step 1: Flesh out `client/package.json`**

```json
{
  "name": "@sports-match/client",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "start": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@sports-match/shared": "*",
    "bootstrap": "^5.3.7",
    "react": "^18.3.1",
    "react-bootstrap": "^2.10.10",
    "react-dom": "^18.3.1",
    "react-router-dom": "^7.6.0",
    "sweetalert2": "^11.22.0"
  },
  "devDependencies": {
    "@testing-library/react": "^16.3.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^5.0.0",
    "jsdom": "^26.0.0",
    "sass": "^1.89.0",
    "typescript": "^5.8.0",
    "vite": "^7.0.0",
    "vitest": "^3.2.0"
  }
}
```
Run: `npm install` (from root). Expected: success.

- [ ] **Step 2: Write `client/vite.config.ts`**

```ts
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@sports-match/shared": fileURLToPath(new URL("../shared/src/index.ts", import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // The ported prototype SCSS (and bootstrap 5) still use @import.
        quietDeps: true,
        silenceDeprecations: ["import", "global-builtin", "color-functions"],
      },
    },
  },
  server: {
    port: 3000,
    proxy: { "/api": "http://localhost:4000" },
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
```

- [ ] **Step 3: Write `client/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vite/client", "vitest/globals"],
    "baseUrl": ".",
    "paths": {
      "@sports-match/shared": ["../shared/src/index.ts"]
    }
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 4: Write `client/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Find partners for your favorite sports" />
    <title>Sports Match</title>
    <!-- ion-icon web components (prototype loaded these via a JS import; a script tag is the supported way) -->
    <script type="module" src="https://cdn.jsdelivr.net/npm/ionicons@7.4.0/dist/ionicons/ionicons.esm.js"></script>
    <script nomodule src="https://cdn.jsdelivr.net/npm/ionicons@7.4.0/dist/ionicons/ionicons.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Port styles and assets from the prototype branch**

```bash
git checkout prototype -- \
  src/_variables.scss src/_mixins.scss src/index.scss src/App.scss src/sweetalert2-custom.scss \
  src/components/NavBar/NavBar.scss src/components/HomeCard/HomeCard.scss \
  src/pages/Home/Home.scss src/pages/LoginAndRegister/LoginAndRegister.scss src/pages/Profile/Profile.scss \
  src/images/gradient2.jpg src/images/projectBackground3.png src/images/user.png \
  src/images/errorPage.gif src/images/11.mov src/images/homePage \
  public/favicon.ico public/robots.txt
mkdir -p client/public
cp -r src/. client/src/
mv public/favicon.ico public/robots.txt client/public/
rm -rf src public
git add -A
```
Expected: `git status` shows the files as new under `client/`. The layout under `client/src/` mirrors the prototype's `src/`, so every relative `../../images/...` and `./X.scss` import in ported pages keeps working.

- [ ] **Step 6: Fix the webpack-only import in `client/src/App.scss`**

Line 1 uses CRA's tilde convention, which Vite doesn't support. Change:
```scss
@import '~bootstrap/scss/bootstrap';
```
to:
```scss
@import 'bootstrap/scss/bootstrap';
```

- [ ] **Step 7: Write entry, placeholder App, and type declarations**

`client/src/main.tsx`:
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.scss";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

`client/src/App.tsx` (placeholder — replaced in Task 9):
```tsx
import "./App.scss";

export default function App() {
  return <h1 style={{ color: "white", textAlign: "center" }}>Sports Match — client scaffold OK</h1>;
}
```

`client/src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
```

`client/src/types/ion-icon.d.ts`:
```ts
import type * as React from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "ion-icon": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        name?: string;
      };
    }
  }
}
```

- [ ] **Step 8: Verify dev server and production build**

```bash
npm run dev -w client
```
Expected: open http://localhost:3000 — the scaffold heading renders over the prototype's gradient background (from `index.scss`). Stop with Ctrl+C. Then:
```bash
npm run build -w client
```
Expected: `tsc --noEmit` silent, `vite build` completes (a chunk-size warning from bootstrap is acceptable).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(client): vite scaffold with ported prototype styles and assets"
```

---

### Task 8: Typed API client + AuthContext + RequireAuth

**Files:**
- Create: `client/src/api/http.ts`, `client/src/api/auth.ts`, `client/src/api/users.ts`, `client/src/context/AuthContext.tsx`, `client/src/components/RequireAuth.tsx`
- Test: `client/src/api/http.test.ts`, `client/src/components/RequireAuth.test.tsx`

**Interfaces:**
- Consumes: shared types (`RegisterInput`, `LoginInput`, `UpdateProfileInput`, `PublicUser`, `ApiErrorBody`); server endpoints from Tasks 4–6.
- Produces (used by Tasks 9–11):
  - `ApiError` class `{ status: number; code: string; message: string }`; `request<T>(path, options?): Promise<T>`
  - `authApi`: `register(input: RegisterInput): Promise<PublicUser>`, `login(input: LoginInput): Promise<PublicUser>`, `logout(): Promise<void>`, `fetchMe(): Promise<PublicUser>`
  - `usersApi`: `updateProfile(input: UpdateProfileInput): Promise<PublicUser>`
  - `AuthProvider` component; `useAuth(): { user: PublicUser | null; loading: boolean; register(i: RegisterInput): Promise<void>; login(i: LoginInput): Promise<void>; logout(): Promise<void>; updateProfile(i: UpdateProfileInput): Promise<void> }`
  - `RequireAuth` route-outlet component (redirects to `/login` with `state.from`)

- [ ] **Step 1: Write the failing tests**

`client/src/api/http.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, request } from "./http";

function stubFetch(status: number, body: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(body === null ? null : JSON.stringify(body), { status })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("request", () => {
  it("returns the parsed body on success", async () => {
    stubFetch(200, { user: { username: "andrei" } });
    const result = await request<{ user: { username: string } }>("/api/auth/me");
    expect(result.user.username).toBe("andrei");
  });

  it("returns undefined for 204 responses", async () => {
    stubFetch(204, null);
    await expect(request<void>("/api/auth/logout", { method: "POST" })).resolves.toBeUndefined();
  });

  it("throws ApiError with the server's code and message on failure", async () => {
    stubFetch(409, { error: { code: "USERNAME_TAKEN", message: "Username already exists" } });
    const promise = request("/api/auth/register", { method: "POST", body: "{}" });
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({ status: 409, code: "USERNAME_TAKEN", message: "Username already exists" });
  });

  it("throws a generic ApiError when the body is not the envelope", async () => {
    stubFetch(502, null);
    await expect(request("/api/health")).rejects.toMatchObject({ status: 502, code: "UNKNOWN" });
  });
});
```

`client/src/components/RequireAuth.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../context/AuthContext";
import RequireAuth from "./RequireAuth";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RequireAuth", () => {
  it("redirects anonymous visitors to /login", async () => {
    // fetchMe returns 401 → user stays null → redirect.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "You must be logged in" } }), { status: 401 }),
      ),
    );
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/profile"]}>
          <Routes>
            <Route path="/login" element={<div>Login page</div>} />
            <Route element={<RequireAuth />}>
              <Route path="/profile" element={<div>Secret profile</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );
    expect(await screen.findByText("Login page")).toBeDefined();
    expect(screen.queryByText("Secret profile")).toBeNull();
  });

  it("renders the protected page for a logged-in user", async () => {
    const user = { id: "1", username: "andrei", age: null, city: "", gender: "", image: "", activities: [] };
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ user }), { status: 200 })));
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/profile"]}>
          <Routes>
            <Route path="/login" element={<div>Login page</div>} />
            <Route element={<RequireAuth />}>
              <Route path="/profile" element={<div>Secret profile</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );
    expect(await screen.findByText("Secret profile")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -w client`
Expected: FAIL — modules `./http`, `../context/AuthContext`, `./RequireAuth` not found.

- [ ] **Step 3: Write `client/src/api/http.ts`**

```ts
import type { ApiErrorBody } from "@sports-match/shared";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (res.status === 204) {
    return undefined as T;
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const envelope = body as ApiErrorBody | null;
    throw new ApiError(
      res.status,
      envelope?.error?.code ?? "UNKNOWN",
      envelope?.error?.message ?? "Something went wrong",
    );
  }
  return body as T;
}
```

- [ ] **Step 4: Write `client/src/api/auth.ts` and `client/src/api/users.ts`**

`client/src/api/auth.ts`:
```ts
import type { LoginInput, PublicUser, RegisterInput } from "@sports-match/shared";
import { request } from "./http";

export async function register(input: RegisterInput): Promise<PublicUser> {
  const res = await request<{ user: PublicUser }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.user;
}

export async function login(input: LoginInput): Promise<PublicUser> {
  const res = await request<{ user: PublicUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.user;
}

export function logout(): Promise<void> {
  return request<void>("/api/auth/logout", { method: "POST" });
}

export async function fetchMe(): Promise<PublicUser> {
  const res = await request<{ user: PublicUser }>("/api/auth/me");
  return res.user;
}
```

`client/src/api/users.ts`:
```ts
import type { PublicUser, UpdateProfileInput } from "@sports-match/shared";
import { request } from "./http";

export async function updateProfile(input: UpdateProfileInput): Promise<PublicUser> {
  const res = await request<{ user: PublicUser }>("/api/users/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return res.user;
}
```

- [ ] **Step 5: Write `client/src/context/AuthContext.tsx`**

```tsx
import type { LoginInput, PublicUser, RegisterInput, UpdateProfileInput } from "@sports-match/shared";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as authApi from "../api/auth";
import { ApiError } from "../api/http";
import * as usersApi from "../api/users";

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  register: (input: RegisterInput) => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi
      .fetchMe()
      .then(setUser)
      .catch((err: unknown) => {
        // 401 just means "not logged in" — anything else is worth surfacing in the console.
        if (!(err instanceof ApiError && err.status === 401)) {
          console.error(err);
        }
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    register: async (input) => {
      setUser(await authApi.register(input));
    },
    login: async (input) => {
      setUser(await authApi.login(input));
    },
    logout: async () => {
      await authApi.logout();
      setUser(null);
    },
    updateProfile: async (input) => {
      setUser(await usersApi.updateProfile(input));
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
```

- [ ] **Step 6: Write `client/src/components/RequireAuth.tsx`**

```tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <Outlet />;
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test -w client`
Expected: PASS — all http and RequireAuth tests green.

- [ ] **Step 8: Typecheck and commit**

```bash
npm run build -w client
git add client package-lock.json
git commit -m "feat(client): typed api client, auth context, protected routes"
```

---

### Task 9: App shell — NavBar, Home page, routing

**Files:**
- Create: `client/src/components/NavBar/NavBar.tsx`, `client/src/components/HomeCard/HomeCard.tsx`, `client/src/components/Modals/ConfirmModal.ts`, `client/src/pages/Home/Home.tsx`, `client/src/pages/ComingSoon/ComingSoon.tsx`
- Modify: `client/src/App.tsx` (real routes), `client/src/main.tsx` (AuthProvider)

**Interfaces:**
- Consumes: `useAuth` from Task 8; ported SCSS/images from Task 7.
- Produces: route table `index→/home`, `/home` public, protected group (`/activities`, `/buddySearch`, `/messages`, `/places` as `ComingSoon`), 404 hedgehog. Tasks 10–11 each add their `<Route>` lines to this file. `ConfirmModal(title: string, text: string): Promise<boolean>`.
- Change vs prototype (intentional): routing moves out of NavBar into `App.tsx`; NavBar becomes navigation-only and reads auth from context.

- [ ] **Step 1: Write `client/src/components/Modals/ConfirmModal.ts`**

```ts
import Swal from "sweetalert2";

export default async function ConfirmModal(title: string, text: string): Promise<boolean> {
  const result = await Swal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes",
    cancelButtonText: "No",
  });
  return result.isConfirmed;
}
```

- [ ] **Step 2: Write `client/src/components/NavBar/NavBar.tsx`** (prototype JSX, minus the `<Routes>`, auth from context)

```tsx
import { useState } from "react";
import { Container, Nav, NavDropdown, Navbar } from "react-bootstrap";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ConfirmModal from "../Modals/ConfirmModal";
import "./NavBar.scss";

function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const hideNav =
    location.pathname === "/home" || location.pathname === "/login" || location.pathname === "/register";

  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => {
    setExpanded(!expanded);
  };

  const handleLogout = async () => {
    const isConfirmed = await ConfirmModal("Logout", "Are you sure you want to logout?");
    if (isConfirmed) {
      await logout();
      navigate("/login");
    }
  };

  return (
    <Navbar variant="dark" bg="dark">
      <Container>
        {!hideNav && <Navbar.Toggle aria-controls="navbar-nav" onClick={handleToggle} />}
        <Navbar.Collapse id="navbar-nav">
          {!hideNav && (
            <Nav className="mx-auto nav-links d-flex flex-row justify-content-center align-items-center gap-3">
              <Nav.Link as={Link} to="/home">Home</Nav.Link>
              <Nav.Link as={Link} to="/profile">My Profile</Nav.Link>
              <Nav.Link as={Link} to="/activities">Activities</Nav.Link>
              <Nav.Link as={Link} to="/buddySearch">Buddy Search</Nav.Link>
              <Nav.Link as={Link} to="/messages">Messages</Nav.Link>
              <Nav.Link as={Link} to="/places">Places</Nav.Link>
              {user ? (
                <Nav.Item>
                  <NavDropdown.Item onClick={handleLogout}>Logout</NavDropdown.Item>
                </Nav.Item>
              ) : (
                <Nav.Item>
                  <Nav.Link as={Link} to="/login">Login</Nav.Link>
                </Nav.Item>
              )}
            </Nav>
          )}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default NavBar;
```

- [ ] **Step 3: Write `client/src/components/HomeCard/HomeCard.tsx`** (prototype code, typed, dead comment block dropped)

```tsx
import { Link } from "react-router-dom";
import "./HomeCard.scss";

interface HomeCardProps {
  image: string;
  description: string;
  to: string;
}

export default function HomeCard({ image, description, to }: HomeCardProps) {
  return (
    <div className="homeCardContainer">
      <Link to={to}><img src={image} alt="Sport Match photo" /></Link>
      <Link to={to}> <h2>{description}</h2></Link>
    </div>
  );
}
```

- [ ] **Step 4: Write `client/src/pages/Home/Home.tsx`** (prototype code, typed, dead comment block dropped)

```tsx
import { Col, Container, Row } from "react-bootstrap";
import HomeCard from "../../components/HomeCard/HomeCard";
import myVideo from "../../images/11.mov";
import activities from "../../images/homePage/Icons8_flat_sports_mode.svg.png";
import places from "../../images/homePage/homePagePlaces.png";
import myProfile from "../../images/homePage/homePageProfile.png";
import messages from "../../images/homePage/mess.png";
import buddySearch from "../../images/homePage/search.png";
import "./Home.scss";

export default function HomePage() {
  const navElements = [
    { image: myProfile, description: "My profile", to: "/profile" },
    { image: activities, description: "Activities", to: "/activities" },
    { image: buddySearch, description: "Buddy search", to: "/buddySearch" },
    { image: messages, description: "Messages", to: "/messages" },
    { image: places, description: "Places", to: "/places" },
  ];

  return (
    <div>
      <video className="background-video" autoPlay muted loop>
        <source src={myVideo} type="video/mp4" />
      </video>
      <Container className="home-container">
        <Row>
          <Col className="siteDescription">
            <h2 className="siteNameTitle">SPORTS MATCH</h2>
            <div className="logo"></div>
            <h2 className="siteSloganTitle">
              Choose an activity, meet new people, have fun doing it together
            </h2>
          </Col>
        </Row>
        <Row className="navContainer">
          {navElements.map((data) => (
            <Col key={data.description} xs={6} sm={6} md={4} lg={3}>
              <HomeCard image={data.image} description={data.description} to={data.to} />
            </Col>
          ))}
        </Row>
      </Container>
    </div>
  );
}
```
Note: the prototype passed `className="linkIcon"` to HomeCard, which HomeCard ignored — so omitting it here (strict TS rejects unknown props) keeps the visual result identical.

Vite needs to treat `.mov` as an asset URL. Add to `client/src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />

declare module "*.mov" {
  const src: string;
  export default src;
}
```
And in `client/vite.config.ts`, add at the top level of the config object:
```ts
  assetsInclude: ["**/*.mov"],
```

- [ ] **Step 5: Write `client/src/pages/ComingSoon/ComingSoon.tsx`**

```tsx
interface ComingSoonProps {
  feature: string;
}

export default function ComingSoon({ feature }: ComingSoonProps) {
  return (
    <div style={{ color: "white", textAlign: "center", marginTop: "4rem" }}>
      <h2>{feature} is coming soon</h2>
      <p>This part of Sports Match is being rebuilt on the new platform.</p>
    </div>
  );
}
```

- [ ] **Step 6: Replace `client/src/App.tsx` with the real route table**

```tsx
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import NavBar from "./components/NavBar/NavBar";
import RequireAuth from "./components/RequireAuth";
import errorpic from "./images/errorPage.gif";
import ComingSoon from "./pages/ComingSoon/ComingSoon";
import HomePage from "./pages/Home/Home";
import "./App.scss";

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route index element={<Navigate to="/home" />} />
        <Route path="/home" element={<HomePage />} />
        <Route element={<RequireAuth />}>
          <Route path="/activities" element={<ComingSoon feature="Activities" />} />
          <Route path="/buddySearch" element={<ComingSoon feature="Buddy Search" />} />
          <Route path="/messages" element={<ComingSoon feature="Messages" />} />
          <Route path="/places" element={<ComingSoon feature="Places" />} />
        </Route>
        <Route
          path="*"
          element={
            <div>
              <h2 style={{ color: "white", display: "flex", justifyContent: "center" }}>
                Page not found. You've taken a wrong turn, but you found a hedgehog.
              </h2>
              <div className="errorImage">
                <img width={650} src={errorpic} alt="errorImage" />
              </div>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 7: Wrap the app in `AuthProvider` — `client/src/main.tsx`**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./index.scss";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
```

- [ ] **Step 8: Verify in the browser**

```bash
npm run dev:memory
```
Expected: http://localhost:3000 redirects to `/home` — background video, SPORTS MATCH title, five cards. Clicking a card (e.g. My profile → not yet routed) shows the hedgehog 404; `/activities` redirects to `/login` (blank page for now — built next). Tests still green: `npm test -w client`. Stop servers.

- [ ] **Step 9: Typecheck and commit**

```bash
npm run build -w client
git add client
git commit -m "feat(client): app shell with navbar, home page, and route table"
```

---

### Task 10: Login and Register pages against the real API

**Files:**
- Create: `client/src/components/CustomAlert/CustomAlert.tsx`, `client/src/pages/LoginAndRegister/LoginForm.tsx`, `client/src/pages/LoginAndRegister/RegistrationForm.tsx`
- Modify: `client/src/App.tsx` (two routes)

**Interfaces:**
- Consumes: `useAuth().login/register`, `ApiError` (Task 8); `registerInputSchema` from shared (client-side field validation — same rules and messages as the server); ported `LoginAndRegister.scss` (Task 7).
- Produces: `/login` and `/register` routes. Changes vs prototype (intentional): register auto-logs-in and navigates to `/home` (the API sets the session on register); login honors `state.from` from RequireAuth; the CDN ES-import of ionicons is gone (loaded in `index.html` since Task 7); register's dead localStorage check is gone; the prototype's swapped password/confirm feedback slots are fixed.

- [ ] **Step 1: Write `client/src/components/CustomAlert/CustomAlert.tsx`**

```tsx
import { Alert } from "react-bootstrap";

interface CustomAlertProps {
  variant: "success" | "danger" | "warning" | "info";
  message: string;
}

export default function CustomAlert({ variant, message }: CustomAlertProps) {
  return <Alert variant={variant}>{message}</Alert>;
}
```

- [ ] **Step 2: Write `client/src/pages/LoginAndRegister/LoginForm.tsx`**

```tsx
import { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { Link, useLocation, useNavigate } from "react-router-dom";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import { useAuth } from "../../context/AuthContext";
import "./LoginAndRegister.scss";

interface AlertState {
  show: boolean;
  variant: "success" | "danger";
  message: string;
}

function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [alert, setAlert] = useState<AlertState>({ show: false, variant: "success", message: "" });

  const from = (location.state as { from?: string } | null)?.from ?? "/home";
  const formValid = username !== "" && password !== "";

  // react-bootstrap's Form.Control types onChange against this element union.
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "username") {
      setUsername(value.trim());
    } else if (name === "password") {
      setPassword(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) {
      return;
    }
    try {
      await login({ username, password });
      setAlert({ show: true, variant: "success", message: "Login successful!" });
      setTimeout(() => {
        navigate(from);
      }, 1000);
    } catch {
      setAlert({ show: true, variant: "danger", message: "Invalid username or password." });
    }
  };

  return (
    <div className="introPage">
      <section className="pageHolder">
        <form className="loginForm" onSubmit={handleSubmit}>
          <h2 className="loginTitle">Login</h2>
          {alert.show && <CustomAlert variant={alert.variant} message={alert.message} />}
          <Form.Group controlId="username">
            <div className="inputBox">
              <span className="icon"><ion-icon name="person"></ion-icon></span>
              <Form.Control type="text" name="username" value={username} onChange={handleChange} required />
              <Form.Label>Username</Form.Label>
            </div>
          </Form.Group>

          <Form.Group controlId="password">
            <div className="inputBox">
              <span className="icon"><ion-icon name="lock-closed"></ion-icon></span>
              <Form.Control type="password" name="password" value={password} onChange={handleChange} required />
              <Form.Label>Password</Form.Label>
            </div>
          </Form.Group>
          <span className="btnHolder">
            <Button type="submit" className={`submit-btn ${formValid ? "enabled" : ""}`}>
              Login
            </Button>
            <div className="registerLink">
              <p className="have-account">Don't have an account?
                <Link to="/register"><span className="registerHover"> Sign up</span></Link></p>
            </div>
          </span>
        </form>
      </section>
    </div>
  );
}

export default LoginForm;
```

- [ ] **Step 3: Write `client/src/pages/LoginAndRegister/RegistrationForm.tsx`**

Field-level validation reuses the **shared** schema, so the browser shows the same messages the server enforces:

```tsx
import { registerInputSchema } from "@sports-match/shared";
import { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../api/http";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import { useAuth } from "../../context/AuthContext";
import "./LoginAndRegister.scss";

interface FieldErrors {
  username?: string;
  password?: string;
  confirmPassword?: string;
}

interface AlertState {
  show: boolean;
  variant: "success" | "danger";
  message: string;
}

function firstIssue(result: { success: boolean; error?: { issues: { message: string }[] } }): string | undefined {
  return result.success ? undefined : result.error?.issues[0]?.message;
}

const RegistrationForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState<AlertState>({ show: false, variant: "success", message: "" });
  const { register } = useAuth();
  const navigate = useNavigate();

  const formValid =
    username !== "" &&
    password !== "" &&
    confirmPassword === password &&
    !errors.username &&
    !errors.password &&
    !errors.confirmPassword;

  // react-bootstrap's Form.Control types onChange against this element union.
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const newErrors: FieldErrors = { ...errors };
    if (name === "username") {
      const trimmed = value.trim();
      setUsername(trimmed);
      newErrors.username = firstIssue(registerInputSchema.shape.username.safeParse(trimmed));
    } else if (name === "password") {
      setPassword(value);
      newErrors.password = firstIssue(registerInputSchema.shape.password.safeParse(value));
      newErrors.confirmPassword = confirmPassword !== value && confirmPassword !== "" ? "Passwords do not match" : undefined;
    } else if (name === "confirmPassword") {
      setConfirmPassword(value);
      newErrors.confirmPassword = value !== password ? "Passwords do not match" : undefined;
    }
    setErrors(newErrors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) {
      return;
    }
    try {
      await register({ username, password });
      setAlert({ show: true, variant: "success", message: "Registration successful!" });
      setTimeout(() => {
        navigate("/home");
      }, 1000);
    } catch (error) {
      const message =
        error instanceof ApiError && error.code === "USERNAME_TAKEN"
          ? "Username already taken."
          : error instanceof ApiError
            ? error.message
            : "Something went wrong. Please try again.";
      setAlert({ show: true, variant: "danger", message });
    }
  };

  return (
    <div className="introPage">
      <section className="pageHolder">
        <Form className="registrationForm" onSubmit={handleSubmit}>
          <h2 className="registerTitle">Register</h2>
          {alert.show && <CustomAlert variant={alert.variant} message={alert.message} />}
          <Form.Group controlId="username">
            <div className="inputBox">
              <span className="icon"><ion-icon name="person"></ion-icon></span>
              <Form.Control type="text" name="username" value={username} onChange={handleChange} isInvalid={!!errors.username} required />
              <label>Username</label>
            </div>
          </Form.Group>
          <Form.Control.Feedback className="text-danger" type="invalid">{errors.username}</Form.Control.Feedback>

          <Form.Group controlId="password">
            <div className="inputBox">
              <span className="icon"><ion-icon name="lock-closed"></ion-icon></span>
              <Form.Control type="password" name="password" value={password} onChange={handleChange} isInvalid={!!errors.password} required />
              <label>Password</label>
            </div>
          </Form.Group>
          <Form.Control.Feedback className="text-danger" type="invalid">{errors.password}</Form.Control.Feedback>

          <Form.Group controlId="confirmPassword">
            <div className="inputBox">
              <span className="icon"><ion-icon name="lock-closed"></ion-icon></span>
              <Form.Control type="password" name="confirmPassword" value={confirmPassword} onChange={handleChange} isInvalid={!!errors.confirmPassword} required />
              <label>Confirm Password</label>
            </div>
          </Form.Group>
          <Form.Control.Feedback className="text-danger" type="invalid">{errors.confirmPassword}</Form.Control.Feedback>

          <span className="btnHolder">
            <Button type="submit" className={`submit-btn ${formValid ? "enabled" : "disabled"}`} disabled={!formValid}>
              Register
            </Button>
            <div className="registerLink">
              <p className="haveAnAcount">Already have an account?
                <Link to="/login"><span className="registerHover"> Log in</span></Link></p>
            </div>
          </span>
        </Form>
      </section>
    </div>
  );
};
export default RegistrationForm;
```

- [ ] **Step 4: Add the routes to `client/src/App.tsx`**

Add imports:
```tsx
import LoginForm from "./pages/LoginAndRegister/LoginForm";
import RegistrationForm from "./pages/LoginAndRegister/RegistrationForm";
```
Add above the `/home` route:
```tsx
        <Route path="/register" element={<RegistrationForm />} />
        <Route path="/login" element={<LoginForm />} />
```

- [ ] **Step 5: Verify end-to-end in the browser**

```bash
npm run dev:memory
```
Expected at http://localhost:3000/register: prototype-identical styling; typing `ab` under username shows "Username must be at least 3 characters long"; registering `andrei` / `Secret1` shows the success alert and lands on `/home` **logged in** (NavBar shows Logout on non-home pages). Register the same name again → "Username already taken." Login page: wrong password shows the danger alert; correct login works. Stop servers.

- [ ] **Step 6: Run tests, typecheck, commit**

```bash
npm test -w client
npm run build -w client
git add client
git commit -m "feat(client): login and register pages wired to the real api"
```

---

### Task 11: Profile page against the real API

**Files:**
- Create: `client/src/pages/Profile/Profile.tsx`
- Modify: `client/src/App.tsx` (one route)

**Interfaces:**
- Consumes: `useAuth().user/updateProfile`, `UpdateProfileInput` shared type, ported `Profile.scss` + `sweetalert2-custom.scss` + `user.png` (Task 7), `RequireAuth` (Task 8).
- Produces: `/profile` protected route. Changes vs prototype (intentional): the LoginModal/redirect dance is replaced by RequireAuth; activities render as read-only text chips (selection UI is Phase 2); saving calls `PATCH /api/users/me`.

- [ ] **Step 1: Write `client/src/pages/Profile/Profile.tsx`**

```tsx
import type { UpdateProfileInput } from "@sports-match/shared";
import { useState } from "react";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import { useAuth } from "../../context/AuthContext";
import userImage from "../../images/user.png";
import "../../sweetalert2-custom.scss";
import "./Profile.scss";

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<UpdateProfileInput>({});
  const [error, setError] = useState("");

  if (!user) {
    return null; // RequireAuth guarantees a user; this narrows the type.
  }

  const startEditing = () => {
    setDraft({ age: user.age, city: user.city, gender: user.gender, image: user.image });
    setIsEditing(true);
  };

  const handleEdit = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    if (name === "age") {
      const parsed = parseInt(value, 10);
      setDraft({ ...draft, age: Number.isNaN(parsed) ? null : Math.max(0, Math.min(parsed, 100)) });
    } else if (name === "city") {
      setDraft({ ...draft, city: value });
    } else if (name === "gender") {
      setDraft({ ...draft, gender: value as UpdateProfileInput["gender"] });
    }
  };

  const handleSave = async () => {
    try {
      await updateProfile(draft);
      setError("");
      setIsEditing(false);
    } catch {
      setError("Could not save your profile. Please try again.");
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setDraft({ ...draft, image: "" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setDraft({ ...draft, image: typeof reader.result === "string" ? reader.result : "" });
    };
    reader.readAsDataURL(file);
  };

  const displayedImage = (isEditing ? draft.image : user.image) || userImage;

  return (
    <div className="profilePageContainer">
      <div className="profileInfo">
        {error && <CustomAlert variant="danger" message={error} />}
        <div className="profileImage">
          <img src={displayedImage} alt={user.username} />
          {isEditing && (
            <div className="file-input-container">
              <input type="file" name="image" id="file-input" className="file-input" onChange={handleImageChange} accept="image/*" />
              <label htmlFor="file-input" className="file-input-label">Choose File</label>
            </div>
          )}
        </div>
        <div className="userInfo">
          <h2>
            <span className="icon">
              <ion-icon name="accessibility-outline"></ion-icon>{" "}
              {user.username}
            </span>
          </h2>
          <p>
            <span className="icon">
              <ion-icon name="calendar-outline"></ion-icon>{" "}
              {isEditing ? (
                <input style={{ position: "relative" }} type="number" name="age" value={draft.age ?? ""} onChange={handleEdit} placeholder="Edit your age" />
              ) : (
                <>{typeof user.age === "number" ? user.age : ""}</>
              )}
            </span>
          </p>
          <p>
            <span className="icon">
              <ion-icon name="location-outline"></ion-icon>{" "}
            </span>
            {isEditing ? (
              <input type="text" name="city" value={draft.city ?? ""} onChange={handleEdit} placeholder="Edit your location" />
            ) : (
              user.city
            )}
          </p>
          <p>
            <span className="icon">
              <ion-icon name="transgender-outline"></ion-icon>{" "}
            </span>
            {isEditing ? (
              <select style={{ cursor: "pointer" }} name="gender" value={draft.gender ?? ""} onChange={handleEdit}>
                <option value="">Choose gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            ) : (
              user.gender
            )}
          </p>
        </div>
        {isEditing ? (
          <button onClick={handleSave}>Save</button>
        ) : (
          <button onClick={startEditing}>Edit</button>
        )}
      </div>
      <div>
        <h3>{user.username}'s activities:</h3>
        {user.activities.length > 0 ? (
          <div className="activitiesList">
            {user.activities.map((activity) => (
              <div key={activity}>{activity}</div>
            ))}
          </div>
        ) : (
          <p>No activities added yet</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the route to `client/src/App.tsx`**

Add the import:
```tsx
import ProfilePage from "./pages/Profile/Profile";
```
Add inside the `<Route element={<RequireAuth />}>` group, first line:
```tsx
          <Route path="/profile" element={<ProfilePage />} />
```

- [ ] **Step 3: Verify end-to-end in the browser**

```bash
npm run dev:memory
```
Expected: visiting `/profile` logged out redirects to `/login`; after logging in, Edit → set age 30, city Sofia, gender, pick an image → Save. **Refresh the page** — the values persist (they're in MongoDB now, not the browser). Stop servers.

- [ ] **Step 4: Run tests, typecheck, commit**

```bash
npm test -w client
npm run build -w client
git add client
git commit -m "feat(client): profile page persisting edits through the api"
```

---

### Task 12: In-memory dev mode, README, final verification

**Files:**
- Create: `server/src/dev-memory.ts`
- Modify: `server/package.json` (one script), `README.md` (rewrite)

**Interfaces:**
- Consumes: everything.
- Produces: `npm run dev:memory` (used since Task 9 — this task makes it official and documents it); the rewritten README; a fully verified walking skeleton.

- [ ] **Step 1: Write `server/src/dev-memory.ts`**

```ts
// Local development without an Atlas account: boots a throwaway in-memory
// MongoDB, then starts the normal server against it. Data resets on restart.
import { MongoMemoryServer } from "mongodb-memory-server";

const mongod = await MongoMemoryServer.create();
process.env.MONGO_URL = mongod.getUri();
process.env.SESSION_SECRET ??= "dev-memory-secret";

await import("./index");
```

Add to `server/package.json` scripts:
```json
    "dev:memory": "tsx src/dev-memory.ts",
```

**Note on ordering:** Tasks 9–11 already used `npm run dev:memory` for browser verification. If executing tasks strictly in order, do this task's Step 1 the first time a browser-verification step needs it, then finish the rest of Task 12 at the end.

- [ ] **Step 2: Rewrite `README.md`**

```markdown
# Sports Match

A platform for finding people to play your favorite sports with: build a
profile around the sports you love, find nearby players who share them,
chat to arrange a game, and discover venues in your city.

**Status:** rebuilt from scratch as a full-stack TypeScript app (Phase 1:
auth + profiles). The original 2023 prototype lives on the
[`prototype`](../../tree/prototype) branch.

## Structure

- `client/` — React 18 + Vite single-page app
- `server/` — Express 5 API, MongoDB, session-cookie auth
- `shared/` — Zod schemas shared by both (single source of truth for
  validation and types)
- `docs/superpowers/` — design specs and implementation plans

## Getting started

Requires Node >= 20.19.

    npm install
    npm run dev:memory

Open http://localhost:3000. `dev:memory` runs against a throwaway
in-memory MongoDB — no database setup needed, data resets on restart.

To keep data, create a free MongoDB Atlas cluster, copy
`server/.env.example` to `server/.env`, fill in `MONGO_URL` and a random
`SESSION_SECRET`, then run:

    npm run dev

## Scripts

- `npm run dev` — client (:3000) + server (:4000), real database
- `npm run dev:memory` — same, with in-memory MongoDB
- `npm test` — all workspace test suites
- `npm run build` — typecheck everything + production client build

## Roadmap

1. ✅ Auth + profiles (this phase)
2. Activities + buddy search
3. Real-time chat (Socket.io)
4. Places catalogue with geo search
```

- [ ] **Step 3: Full verification**

```bash
npm test
npm run build
```
Expected: shared, server, and client suites all green; all three builds/typechecks pass.

- [ ] **Step 4: Manual click-through (the phase 1 success criterion)**

Run `npm run dev:memory` (or `npm run dev` with Atlas configured) and walk through:
1. `/register` → create `andrei` / `Secret1` → lands on `/home` logged in.
2. `/profile` → Edit → age, city, gender, photo → Save → **hard refresh** → data still there.
3. Logout via the navbar (confirm dialog) → `/profile` redirects to `/login`.
4. Log in again → profile intact.
5. **Open a different browser** (or private window — a separate cookie jar): with Atlas, log in as `andrei` and see the same account, proving the data lives server-side. (With `dev:memory`, verify instead that the second browser has no session until it logs in.)
6. Wrong password → "Invalid username or password." Duplicate registration → "Username already taken."

**USER ACTION (Andrei):** create the free MongoDB Atlas M0 cluster and put its connection string in `server/.env` — needed before `npm run dev` (the no-Atlas `dev:memory` mode covers everything else).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: in-memory dev mode and rewritten readme — phase 1 walking skeleton complete"
git push
```

---

## Out of scope (deliberate, per spec)

- Email + verification, password reset, rate limiting — follow-up phases.
- ESLint config — tests + strict tsc gate this phase.
- Real image upload (files travel as data URLs for prototype parity).
- Activities selection UI, buddy search, chat, places — Phases 2–4.
