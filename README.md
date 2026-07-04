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
