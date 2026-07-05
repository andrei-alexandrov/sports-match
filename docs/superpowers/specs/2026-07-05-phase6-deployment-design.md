# Phase 6 — Deployment — Design

**Date:** 2026-07-05
**Status:** Decided autonomously under Andrei's full-autonomy grant
("build the whole project as you see fit"). **Baseline:** Phase 5 complete
at `40e8556` (146 tests: 41 shared / 78 server / 27 client).

## Goal

Make the app production-ready and deployable to a real URL on a
zero-budget stack, with a runbook covering the few steps only a human
with accounts can do (Atlas cluster, host signup).

## Decisions made

| Decision | Choice | Why |
|---|---|---|
| Topology | **Single origin**: one Node process serves the built SPA, the API, and websockets | Session cookies keep working with `sameSite: lax` untouched; zero CORS; Socket.io needs no config; one thing to deploy |
| Host | **Render free tier** (web service) + **MongoDB Atlas M0** | Both permanently free; Render supports websockets and Node on the free plan; blueprint (`render.yaml`) makes setup nearly one-click. Trade-off documented: free instances spin down after ~15 min idle (first request then takes ~30-60s) — acceptable for a demo/beta |
| Server build | **esbuild bundle**: `server/src/index.ts` → `server/dist/index.js` (ESM, platform node), `@sports-match/shared` aliased INTO the bundle, node_modules kept external | tsx-in-prod is a dev tool; tsc-emit trips over the workspace `paths` alias (shared ships TS source only). esbuild resolves the alias exactly like the dev setup does, in one command, no tsconfig gymnastics |
| Static serving | `serveClient(app, distPath)` — `express.static` + SPA fallback (GET, non-`/api`, non-file → `index.html`), mounted only in production boot | Testable in isolation with a fixture dir; dev keeps the Vite proxy. Fallback registered before the 404/error handlers |
| Compression | `compression` middleware, always on | Recorded tech debt; the SPA bundle is the payload that matters |
| Rate limiting | `express-rate-limit` on `/api`, always on, default 300 req/min/IP; `createApp` gains an options param so tests can set a tiny limit and assert 429 | Recorded tech debt; `trust proxy` is already set so client IPs resolve correctly behind Render |
| Session cookie | Already correct (`secure: isProduction`, httpOnly, sameSite lax, Mongo store) — no change | Verified in session.ts |
| Boot | Existing `main()` unchanged (connect → seedPlaces → listen); Render health check hits the existing `/api/health` | seedPlaces' count guard makes first Atlas boot self-seeding |
| Smoke check | Committed `scripts/smoke-prod.mjs` (root `npm run smoke`): boots the built bundle against an in-memory Mongo, curls `/api/health` AND `/` (expects index.html), then exits | Proves the production artifact actually boots — not just that tsc passed |
| Runbook | `DEPLOYMENT.md` + `render.yaml` blueprint + README link | The human-only steps (Atlas cluster, Render signup, env vars) get exact click-level instructions |

## Section 1 — Server changes

- New `server/src/serveClient.ts`: `serveClient(app: express.Express,
  distPath: string): void` — `express.static(distPath)` plus a GET
  fallback middleware (skips `/api` and `/socket.io` paths) sending
  `index.html`. Called from `index.ts` ONLY when `config.isProduction`,
  with the dist path resolved relative to the bundle location
  (`../../client/dist` from `server/dist/`), overridable via
  `CLIENT_DIST` env.
- `createApp(sessionMiddleware?, options?: { apiRateLimitMax?: number })`:
  adds `compression()` early and `express-rate-limit` mounted on `/api`
  (default max 300 per 60s window, `standardHeaders: true`,
  envelope-shaped 429 `{ error: { code: "RATE_LIMITED", message: … } }`).
  Health endpoint stays inside the limit scope (it's an /api route; 300/min
  is far above Render's health cadence).
- Config: no new required vars; `CLIENT_DIST` optional.

## Section 2 — Build pipeline

- `server/package.json`: `build` becomes type-check AND emit —
  `tsc --noEmit && esbuild src/index.ts --bundle --platform=node
  --format=esm --outdir=dist --packages=external
  --alias:@sports-match/shared=<abs-or-relative shared/src/index.ts>`
  (exact flags in the plan; `esbuild` added as devDependency).
- Root `package.json`: `start`: `node server/dist/index.js` (expects
  `NODE_ENV=production` from the host); `smoke`: `node scripts/smoke-prod.mjs`.
- Root `build` already chains shared → server → client; the server leg now
  emits `server/dist/`. `.gitignore` already covers `dist/`.

## Section 3 — Deploy artifacts & runbook

- `render.yaml` (repo root): one free-plan web service — build
  `npm install && npm run build`, start `npm run start`,
  `healthCheckPath: /api/health`, env: `NODE_ENV=production`,
  `SESSION_SECRET` (generateValue), `MONGO_URL` (sync: false — pasted by
  Andrei from Atlas).
- `DEPLOYMENT.md`: (1) Atlas M0 — create cluster, DB user, network access
  `0.0.0.0/0` (Render has no static IPs on free), copy the
  `mongodb+srv://…/sports-match` string; (2) Render — New → Blueprint →
  point at the GitHub repo, paste `MONGO_URL`, deploy; (3) verify —
  health URL, register, seed check (54 places), two-browser chat; (4)
  known free-tier limits (idle spin-down; in-memory rate-limit counters
  reset on restart — fine at this scale); (5) local prod rehearsal:
  `npm run build && npm run smoke`.
- README: Scripts section gains `start`/`smoke`; new short "Deploying"
  section linking DEPLOYMENT.md; roadmap item 6 checked off at the end of
  the phase.

## Section 4 — Testing & success criteria

- **Server tests** (supertest): `serveClient` fixture suite — serves a
  static file; SPA fallback returns index.html for `/buddySearch`;
  `/api/*` still 404s JSON (not index.html); non-GET not swallowed.
  Rate-limit suite via `createApp(undefined, { apiRateLimitMax: 3 })` —
  4th request 429 with envelope code `RATE_LIMITED`. Compression: a
  >1KB response with `Accept-Encoding: gzip` comes back
  `content-encoding: gzip`.
- **Smoke** (not vitest): `npm run build && npm run smoke` green locally.
- **Success criterion**: after Andrei completes the runbook, the app
  serves at `https://<service>.onrender.com` — register, chat between two
  browsers (websockets over the internet), places Near-me, events join —
  all against Atlas.

## Out of scope (deliberate)

- Custom domain, CDN, Docker, CI/CD pipelines, log aggregation, metrics,
  Redis-backed rate limiting/session store, autoscaling, staging
  environment, image/asset optimization, email verification.
