# Sports-Match Full-Stack Rebuild — Design

**Date:** 2026-07-04
**Status:** Approved by Andrei (all four sections approved individually)
**Supersedes:** `2026-07-04-typescript-vite-migration-design.md`

## Background and decision

sports-match is a partner-matching platform for sports: users build a profile
around the sports they play, find nearby people who share them, chat to
arrange a game, and browse a venue catalogue. Core loop:
**profile → match → chat → meet**.

The existing code is a ~1,800-line frontend-only prototype (CRA, React 18):
auth is plaintext passwords in localStorage, chat polls localStorage, data is
simulated. Everything hard and valuable (real auth, database, matching,
real-time chat, geo) is unbuilt. Decision: **rebuild fresh with best
practices, porting the design and assets from the prototype** rather than
migrating code that is guaranteed to be replaced. The classic "never rewrite"
rule does not apply — there is no battle-tested logic to lose.

**Guard against the gold-plating trap:** phase 1 is a walking skeleton
(register → login → profile, end-to-end against the real backend). Features
are added vertically, phase by phase; no infrastructure built ahead of need.

## Decisions made

| Decision | Choice | Why |
|---|---|---|
| Rebuild vs migrate | Fresh start, port the good parts | Hard parts unbuilt; typing localStorage services is polishing throwaway code |
| Framework | React (stay) | 22 components of working UI; largest ecosystem; founder knows it |
| Architecture | Vite SPA + separate Node API, monorepo | Chat needs long-lived sockets (natural on plain Node); no server-component learning curve; explicit fundamentals |
| Next.js | Not now | App is ~90% behind login → SSR/SEO value marginal; revisit if public SEO pages become a growth priority |
| Server framework | Express 5 | Largest body of learning resources; performance difference irrelevant at this scale |
| Database | MongoDB, Atlas M0 free tier for dev | Document model fits profiles; geo indexes fit places; Atlas = zero install, permanently free, one-line switch to local/VPS later |
| Auth | Session cookies (httpOnly) + bcrypt | One server, one DB → sessions simpler and revocable; no JWT choreography; plugs into Socket.io handshake |
| Repo | Same repo; `prototype` branch preserves old code; `main` rebuilt | Keeps history and GitHub URL |
| Phase order | Auth/profile → matching → chat → places | Follows the core loop; approved explicitly |

## Section 1 — Repository & monorepo architecture

npm workspaces monorepo (no Turborepo/Nx — YAGNI at this size):

```
sports-match/
├── client/     # React 18 + TypeScript (strict) + Vite SPA
├── server/     # Node + TypeScript + Express 5 + Socket.io (phase 3)
├── shared/     # Zod schemas + types imported by both client and server
└── package.json  # workspaces root; `npm run dev` runs client + server together
```

- `shared/` is the single source of truth for every API request/response
  shape: Zod schemas provide the server's runtime validation and the client's
  compile-time types from one definition. Client and server cannot drift.
- MongoDB address comes from `.env` (never committed; `.env.example` is).
  Default: **Atlas M0 free tier**. Local MongoDB or a VPS later is a
  one-line connection-string change.
- Old code preserved on a `prototype` branch created from current `main`
  before the restructure.

## Section 2 — Backend design

- **Express 5 + TypeScript**, structured as routes → validation (shared Zod
  schemas) → services → Mongoose models.
- **Auth:** `express-session` with a MongoDB session store
  (`connect-mongo`); passwords hashed with **bcrypt**; browser holds only an
  httpOnly session cookie (unreadable by page JavaScript). Registration is
  username + password to match the ported UI; email + verification is a
  deliberate follow-up phase.
- **REST API** under `/api/`:
  - Phase 1: `POST auth/register`, `POST auth/login`, `POST auth/logout`,
    `GET auth/me`, `PATCH users/me`.
  - Phase 2: `GET users/search` (by city + shared activities).
  - Phase 3: `messages` endpoints + Socket.io events.
  - Phase 4: `places` endpoints (city/neighborhood filter; geo-point field
    from day one, geo queries later).
- **Data model (Mongoose):**
  - `User`: username (unique), passwordHash, age?, city?, gender?, image?,
    activities: string[] (keys into the static catalogue).
  - `Message` (phase 3): sender, receiver, text, timestamp, status.
  - `Place` (phase 4): name, city, neighborhood, sports[], location
    (GeoJSON point).
  - The activities catalogue is static content in `shared/`, not a
    collection.
- **Error handling:** one envelope — `{ error: { code, message } }` — from a
  single error middleware; Zod rejects invalid input before business logic.

## Section 3 — Frontend design

- **Vite + React 18 + TypeScript `strict: true`** (zero `any`), react-router
  (library mode).
- **Port, don't rewrite, the UI:** SCSS, images, page structure, and
  react-bootstrap components move from the prototype branch and are typed as
  they land. UI kits: bootstrap + react-bootstrap only; sweetalert2 kept.
  The prototype's unused dependencies are simply never installed.
- **Auth state:** context provider calling `auth/me` on load; `RequireAuth`
  route wrapper replaces the prototype's per-page login-modal checks.
- **Data flow:** typed API client in `client/src/api/` (fetch wrapper +
  shared types) replaces all localStorage services. localStorage is no
  longer a data store; the browser holds only the session cookie.

## Section 4 — Testing, phase 1 scope, roadmap

- **Vitest everywhere.** Server: supertest against `mongodb-memory-server`
  covering register/login/logout/profile in phase 1. Client: component tests
  where logic lives. No coverage theater.
- **Phase 1 — walking skeleton:**
  1. Create `prototype` branch; restructure `main` as the monorepo.
  2. Server scaffold: Express + TS + Mongoose + session auth + Zod
     validation + tests.
  3. Client scaffold: Vite + TS; port login/register/profile pages against
     the real API; auth context + protected routes.
  - **Success criterion:** register in one browser, log in from a different
    browser/machine, see the same account; password stored as a bcrypt hash.
    (The prototype fundamentally could not do this.)
- **Roadmap** (each phase gets its own design-lite → plan → build cycle):
  - Phase 2: activities selection + buddy search (city + shared activities).
  - Phase 3: real-time chat (Socket.io, session-authenticated handshake).
  - Phase 4: places catalogue (+ geo queries).
  - Follow-ups: deployment (client static hosting + server on
    Render/Railway/VPS + Atlas), email + verification, password reset,
    rate limiting on auth endpoints.

## Out of scope

- Next.js / SSR / SEO pages — revisit when public acquisition pages become a
  growth priority; components and shared types port over if that day comes.
- Self-hosting the database on a personal machine — rejected for
  availability, security, and backup reasons; a VPS remains a later option.
- Native mobile apps.
