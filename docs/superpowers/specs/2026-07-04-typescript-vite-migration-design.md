# TypeScript + Vite Migration — Design

**Date:** 2026-07-04
**Status:** Approved by Andrei (sections 1–3 approved individually)
**Scope:** Frontend only. The backend (MongoDB, real auth, real chat) is a separate follow-up project.

## Background and goal

sports-match is a frontend-only Create React App (~1,800 lines of JS across 22
source files): React 18, react-router 6, SCSS, Bootstrap/react-bootstrap,
sweetalert2. Auth and chat are localStorage simulations; there is no server.

This project migrates the codebase to TypeScript with `strict: true` and
replaces the deprecated `react-scripts` toolchain with Vite, while the codebase
is still small enough to convert in a single pass. Dead dependencies and stale
files are removed along the way.

Explicitly **not** goals: no behavior changes, no UI changes, no backend work,
no test suite (deferred until the backend project reshapes the services layer).

The domain types defined here (`User`, `Message`, `Activity`, `Place`) are
intended to become the shared request/response contract for the future backend.

## Decisions made

| Decision | Choice | Why |
|---|---|---|
| Phase scope | TS migration first, backend later | Cheapest to type 1,800 lines now; typed models become the backend contract |
| Build tool | Vite replaces CRA | react-scripts is sunset/unmaintained; migration already touches every file |
| Cleanup | Ride along with the migration | 8 dependency groups are confirmed unused; stale artifacts tracked in git |
| Approach | Two-stage big bang (approach A) | Small codebase; each stage independently verifiable; no mixed JS/TS limbo |
| Strictness | `strict: true` from day one, zero `any` | Loose-then-tighten reliably becomes never; strict forces typed localStorage boundaries |

## Section 1 — Tooling & project structure

- **Vite** (latest) with `@vitejs/plugin-react`.
- `public/index.html` moves to the project root as Vite's entry;
  `%PUBLIC_URL%/favicon.ico` becomes `/favicon.ico`.
- `src/index.js` becomes `src/main.tsx`, referenced from `index.html` via
  `<script type="module" src="/src/main.tsx">`.
- **Scripts:** `dev` runs Vite; `start` kept as an alias for `dev`;
  `build` = `tsc --noEmit && vite build` (Vite does not type-check — the
  explicit `tsc` step is what enforces types at build time); `preview` serves
  the production build.
- **tsconfig.json:** standard Vite React-TS template — `strict: true`,
  `noUnusedLocals`, `noUnusedParameters`, `moduleResolution: "bundler"`,
  `jsx: "react-jsx"`.
- **ESLint:** CRA's `eslintConfig` block is removed with react-scripts;
  replaced by a minimal ESLint 9 flat config with `typescript-eslint` and
  `react-hooks` rules.
- **Dependencies removed** (confirmed unused by import scan):
  `mdb-react-ui-kit`, `emoji-mart`, `emoji-picker-react`, `tiff.js`,
  `web-vitals`, `react-icons`, `@fortawesome/fontawesome-svg-core`,
  `@fortawesome/free-solid-svg-icons`, `@fortawesome/react-fontawesome`,
  `@testing-library/jest-dom`, `@testing-library/react`,
  `@testing-library/user-event`; plus `react-scripts` and
  `google-fonts-webpack-plugin` (webpack-only) with the Vite swap.
- **Dependencies kept:** `react`, `react-dom`, `react-router-dom`,
  `bootstrap`, `react-bootstrap`, `sweetalert2`, `sass`, `react-emoji`.
- **Added (dev):** `vite`, `@vitejs/plugin-react`, `typescript`,
  `@types/react`, `@types/react-dom`, ESLint flat-config packages.

## Section 2 — TypeScript conversion

- All 22 source files convert in one pass: files containing JSX → `.tsx`;
  plain logic (`services/`, `pages/Activities/activitiesData`,
  `components/Utils/Debounce`) → `.ts`.
- **Shared domain types** in a new `src/types/index.ts`: `User`, `Message`,
  `MessageStatus`, `Activity`, `Place`. Component-specific prop interfaces
  stay in their component files.
- **Typed localStorage boundary:** small parse helpers (e.g.
  `loadUsers(): User[]`) wrap `JSON.parse` and normalize missing fields —
  the same defaulting `UserManager`'s constructor already performs, typed and
  centralized. Storage keys (`users`, `loggedInUser`, `chatState`) are
  unchanged.
- Every component gets an explicit props interface; hooks get explicit type
  parameters where inference is insufficient.
- `react-emoji` ships no types: add a hand-written module declaration at
  `src/types/react-emoji.d.ts` covering the one used API (`emojify`).
- **Rules for the pass:** zero `any`; zero behavior changes. If strict mode
  surfaces a genuine pre-existing bug, flag it in the commit message rather
  than silently fixing or absorbing it.

## Section 3 — Cleanup, commit sequence, verification

Three commits, each leaving the app working:

1. **Cleanup** — remove the unused runtime dependencies; delete the stale
   nested `sports-match/sports-match/` clone (untracked 2023 duplicate with
   its own `.git` and `node_modules`); delete the unreferenced 29 MB
   `projectBackgroundWithoutBackground.png` at the repo root and the tracked
   `bash.exe.stackdump`. App still runs under CRA.
2. **Vite swap** — replace react-scripts with Vite while the code is still
   JavaScript. Verified by running the dev server and a production build.
3. **TypeScript conversion** — rename + type all files. Verified by
   `tsc --noEmit` with zero errors and a successful `vite build`.

**Final verification** (no automated tests exist): manual click-through of
every flow — register → login → edit profile → add/remove activities →
buddy search → chat between two browser tabs → places catalogue → logout.

**Error handling posture:** unchanged from today at runtime; the migration
adds compile-time safety plus centralized, defensive parsing at the
localStorage boundary (malformed stored JSON falls back to empty defaults,
matching current behavior).

## Known follow-ups (out of scope here)

- Backend project: Node/TS API + MongoDB, hashed passwords, real-time chat.
  The `src/types/` models are its starting contract.
- Test suite, to be introduced alongside the backend-driven services rewrite.
- Asset audit (e.g. `src/images/11.mov` appears unreferenced) — left alone
  in this project except for the two dead files named above.
