# Phase 2 — Activities + Buddy Search — Design

**Date:** 2026-07-04
**Status:** Approved by Andrei (all four sections approved individually)
**Parent spec:** `2026-07-04-fullstack-rebuild-design.md` (architecture, auth,
monorepo — all fixed there). **Phase 1 baseline:** commit `abafe75`.

## Goal

Port the prototype's Activities and Buddy Search pages onto the real API:
users pick their sports from the catalogue (persisted in MongoDB), and find
other users by sport and city. Completes the "match" step of the core loop
(profile → match → chat → meet); chat itself is Phase 3.

## Decisions made

| Decision | Choice | Why |
|---|---|---|
| Search semantics | Activity dropdown + optional city filter, server-side, AND-combined | Matches spec's "city + shared activities" and the product pitch; smallest step past the prototype (which ignored city) |
| Activity identity | Catalogue keys (kebab-case slugs) in `shared/`; user docs store `string[]` of keys | Prototype stored whole `{name, image}` objects — renames would desync profiles. Keys make the catalogue the single source of truth |
| Activity images | Stay client-side, joined by key | Server/API never carries image weight; catalogue in shared stays tiny |
| Activities update path | `activities` becomes a legitimate, validated field of `PATCH /api/users/me` | One endpoint, one schema; `z.enum(keys)` makes invalid/malicious values unrepresentable |
| Start Chat button | Kept; navigates to `/messages` (ComingSoon until Phase 3) | Visual parity now; works with zero changes when chat lands |
| Result cap | 50, sorted by username, no pagination UI | YAGNI at current scale; cap documented in code and here |

## Section 1 — Shared contract

- New `shared/src/activities.ts`: the 40-sport catalogue as
  `ACTIVITIES: readonly { key: string; label: string }[]`
  (e.g. `{ key: "table-tennis", label: "Table tennis" }`), with derived
  `ACTIVITY_KEYS` and `activityKeySchema = z.enum(ACTIVITY_KEYS)`. Labels are
  the prototype's display names, verbatim.
- `updateProfileInputSchema` gains
  `activities: z.array(activityKeySchema).optional()` de-duplicated via a
  `.transform()` (duplicates silently collapse). Invalid keys → 400
  VALIDATION_ERROR.
- New `searchUsersQuerySchema = z.object({ activity: activityKeySchema.optional(), city: z.string().trim().max(100).optional() })`.
- `PublicUser` unchanged (`activities: string[]` — now guaranteed to be keys).
- The Phase-1 mass-assignment test evolves: it now asserts `passwordHash`
  and `username` are unreachable via PATCH and that invalid activity keys are
  rejected — activities itself is no longer a protected field.

## Section 2 — Server: search endpoint

`GET /api/users/search` — `requireAuth`, query validated by a new
`validateQuery(schema)` middleware (twin of the existing body `validate`).

Semantics:
- Always excludes the requesting user.
- `activity` present → users whose `activities` array contains the key.
- `city` present → case-insensitive match on the exact trimmed city name,
  implemented with a regex-escaped anchored pattern (no injection surface;
  input already capped at 100 chars).
- Both present → AND. Neither → all other users.
- Cap 50, sort by username ascending, respond `{ users: PublicUser[] }`.

Tests (supertest + in-memory Mongo): filter by activity; city
case-insensitivity ("sofia" finds "Sofia"); AND combination; self-exclusion;
401 anonymous; 400 on unknown activity key.

## Section 3 — Client

Ported from the `prototype` branch: `useDebounce` (typed),
`ActivityComponent` / `ActivityComponentCircle` (typed), the ~40
`activitiesPage/` images, and `Activities.scss`, `BuddySearch.scss`,
`Activity.scss`, `BuddyCard.scss`. Visual identity preserved; classNames
unchanged.

- New `client/src/activities/catalogue.ts`: joins shared `ACTIVITIES` to the
  image imports by key → `ClientActivity { key, label, image }`. A test
  asserts every shared key has an image.
- **Activities page** (replaces its ComingSoon route): prototype grid +
  debounced name search + Add/Remove toggle; toggling awaits
  `updateProfile({ activities })` via the auth context. The prototype's
  LoginModal dance is gone — the route is inside `RequireAuth`.
- **Buddy search page** (replaces its ComingSoon route): activity dropdown
  (catalogue, sorted by label) + city text input **pre-filled with the
  logged-in user's city**, clearable, debounced. Fetches on mount with the
  pre-filled filters (so the first view is "people in my city"), and
  refetches on every debounced filter change via
  `usersApi.searchUsers({ activity?, city? })`; renders ported BuddyCards
  (photo, username, activity labels, Start Chat → `/messages` with
  `state.receiver`).
- **Profile page**: activities section upgrades from the plain-text
  placeholder to `ActivityComponentCircle` (image + ✕ remove, which PATCHes
  the filtered key list) — restoring the prototype's look.
- API client: `usersApi.searchUsers(params): Promise<PublicUser[]>` building
  a query string from defined params only.

## Section 4 — Testing & success criteria

Server tests carry the semantic weight (Section 2 list). Client adds the
catalogue-integrity test and a stubbed-fetch test for `searchUsers` query
construction. All existing tests stay green; the evolved mass-assignment
test replaces the old one.

**Success criterion** (dev:memory): user A adds Tennis and sets city Sofia;
user B searches Tennis in Sofia → A's card appears with photo and sports;
A removes Tennis → A no longer appears.

## Out of scope (deliberate)

- Chat (Phase 3); places (Phase 4).
- Username charset/case normalization (deferred from Phase 1 review — the
  buddy card only displays usernames; revisit when usernames become
  clickable/linkable).
- Pagination, distance/geo search, match scoring, notifications.
- Activity catalogue admin UI — the catalogue is code.
