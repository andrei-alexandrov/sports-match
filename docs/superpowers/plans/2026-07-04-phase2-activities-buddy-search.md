# Phase 2 — Activities + Buddy Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Users pick their sports from a typed catalogue (persisted via the real API) and find other users by sport and city.

**Architecture:** The 40-sport catalogue becomes `{ key, label }` data in `shared/` with `z.enum` validation; `activities` becomes a legitimate, deduplicated field of `PATCH /api/users/me`; a new `GET /api/users/search` filters by activity and case-insensitive city (AND-combined, excludes self, cap 50). The client ports the prototype's Activities grid, BuddySearch page, and profile activity circles, joined to the shared catalogue by key with images staying client-side. Spec: `docs/superpowers/specs/2026-07-04-phase2-activities-buddy-search-design.md`.

**Tech Stack:** unchanged from Phase 1 (TypeScript strict, Zod 4, Express 5, Mongoose 8, Vitest, supertest, mongodb-memory-server, React 18 + Vite).

## Global Constraints

- TypeScript `strict: true`; **zero `any`**. Three sanctioned casts in this phase, each with a comment: `res.locals.query as SearchUsersQuery` (Express 5's `req.query` is a read-only getter), and the two `as ActivityKey[]`-style casts where server-validated `string[]` meets the typed input (Activities/Profile/BuddySearch pages).
- API error envelope, always: `{ error: { code: string, message: string } }`.
- Activity keys are kebab-case slugs; labels are the prototype's display names **verbatim** (e.g. `"Pole Dance"`, `"Table tennis"`).
- Search semantics: excludes requester; `activity` → array-contains key; `city` → case-insensitive anchored regex on the trimmed name (regex-escaped); AND-combined; cap **50**, sorted by username ascending.
- Ported SCSS byte-identical; ported JSX preserves prototype classNames.
- All commands run from repo root `c:\Users\andre\Desktop\sports-match` in Git Bash; commit after every task with the exact message given.
- Phase 1 suites must stay green throughout: shared 9, server 18, client 7 at baseline (HEAD `6f1c43f`); this plan adds/evolves tests per task.

---

### Task 1: Shared catalogue + activities become a validated PATCH field

**Files:**
- Create: `shared/src/activities.ts`
- Modify: `shared/src/schemas.ts` (add import + `activities` field + search query schema), `shared/src/index.ts` (re-export), `server/tests/users.profile.test.ts` (evolve mass-assignment test)
- Test: `shared/src/schemas.test.ts` (extend)

**Interfaces:**
- Consumes: existing `updateProfileInputSchema`, `z` from zod.
- Produces (all exported from `@sports-match/shared`; Tasks 2–6 import these):
  - `ACTIVITIES: readonly { key: string; label: string }[]` (40 entries), `type ActivityKey` (union of the 40 keys), `ACTIVITY_KEYS`, `activityKeySchema`
  - `updateProfileInputSchema` gains `activities?: ActivityKey[]` (deduplicated via `.transform`)
  - `searchUsersQuerySchema = { activity?: ActivityKey; city?: string (trimmed, max 100) }`, `type SearchUsersQuery`
- The server PATCH route needs **no change** — `$set` picks up the new validated field automatically.

- [ ] **Step 1: Write the failing tests — extend `shared/src/schemas.test.ts`**

Add to the imports:
```ts
import { ACTIVITIES } from "./activities";
import { searchUsersQuerySchema } from "./schemas";
```
Append a new describe block:
```ts
describe("activities catalogue", () => {
  it("has 40 entries with unique keys and labels", () => {
    expect(ACTIVITIES).toHaveLength(40);
    expect(new Set(ACTIVITIES.map((a) => a.key)).size).toBe(40);
    expect(new Set(ACTIVITIES.map((a) => a.label)).size).toBe(40);
  });

  it("accepts and dedupes valid activity keys in profile updates", () => {
    const result = updateProfileInputSchema.safeParse({ activities: ["tennis", "tennis", "yoga"] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.activities).toEqual(["tennis", "yoga"]);
    }
  });

  it("rejects unknown activity keys", () => {
    expect(updateProfileInputSchema.safeParse({ activities: ["quidditch"] }).success).toBe(false);
  });
});

describe("searchUsersQuerySchema", () => {
  it("trims city and strips unknown params", () => {
    const result = searchUsersQuerySchema.safeParse({ city: "  Sofia ", activity: "tennis", admin: "1" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ city: "Sofia", activity: "tennis" });
    }
  });

  it("rejects an unknown activity key", () => {
    expect(searchUsersQuerySchema.safeParse({ activity: "quidditch" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -w shared`
Expected: FAIL — `Cannot find module './activities'`.

- [ ] **Step 3: Write `shared/src/activities.ts`**

The 40 entries below are the prototype's catalogue verbatim (labels) with kebab-case keys — order preserved from `prototype:src/pages/Activities/activitiesData.js`:

```ts
export const ACTIVITIES = [
  { key: "tennis", label: "Tennis" },
  { key: "table-tennis", label: "Table tennis" },
  { key: "badminton", label: "Badminton" },
  { key: "football", label: "Football" },
  { key: "squash", label: "Squash" },
  { key: "running", label: "Running" },
  { key: "basketball", label: "Basketball" },
  { key: "volleyball", label: "Volleyball" },
  { key: "ski", label: "Ski" },
  { key: "snowboard", label: "Snowboard" },
  { key: "ice-skating", label: "Ice skating" },
  { key: "padel", label: "Padel" },
  { key: "wall-climbing", label: "Wall climbing" },
  { key: "darts", label: "Darts" },
  { key: "paintball", label: "Paintball" },
  { key: "snooker", label: "Snooker" },
  { key: "bowling", label: "Bowling" },
  { key: "karting", label: "Karting" },
  { key: "dance", label: "Dance" },
  { key: "pool", label: "Pool" },
  { key: "golf", label: "Golf" },
  { key: "fitness", label: "Fitness" },
  { key: "boxing", label: "Boxing" },
  { key: "pole-dance", label: "Pole Dance" },
  { key: "baseball", label: "Baseball" },
  { key: "fencing", label: "Fencing" },
  { key: "cycling", label: "Cycling" },
  { key: "motorcycling", label: "Motorcycling" },
  { key: "rafting", label: "Rafting" },
  { key: "kayak", label: "Kayak" },
  { key: "curling", label: "Curling" },
  { key: "petanka", label: "Petanka" },
  { key: "swimming", label: "Swimming" },
  { key: "martial-arts", label: "Martial arts" },
  { key: "horse-riding", label: "Horse riding" },
  { key: "hockey", label: "Hockey" },
  { key: "roller-skating", label: "Roller skating" },
  { key: "yoga", label: "Yoga" },
  { key: "trampolines", label: "Trampolines" },
  { key: "archery", label: "Archery" },
] as const;

export type ActivityKey = (typeof ACTIVITIES)[number]["key"];

export const ACTIVITY_KEYS = ACTIVITIES.map((a) => a.key) as [ActivityKey, ...ActivityKey[]];
```

- [ ] **Step 4: Extend `shared/src/schemas.ts`**

Add after the zod import:
```ts
import { ACTIVITY_KEYS } from "./activities";
```
Add after `genderSchema` (before `updateProfileInputSchema`):
```ts
export const activityKeySchema = z.enum(ACTIVITY_KEYS);
```
In `updateProfileInputSchema`, add after the `image` field:
```ts
  activities: z
    .array(activityKeySchema)
    .transform((keys) => [...new Set(keys)])
    .optional(),
```
Add after `PublicUser` (before `ApiErrorBody`):
```ts
export const searchUsersQuerySchema = z.object({
  activity: activityKeySchema.optional(),
  city: z.string().trim().max(100).optional(),
});
export type SearchUsersQuery = z.infer<typeof searchUsersQuerySchema>;
```
And in `shared/src/index.ts`, add:
```ts
export * from "./activities";
```

- [ ] **Step 5: Run shared tests**

Run: `npm test -w shared`
Expected: PASS (14 tests). Then `npm run build -w shared` — clean.

- [ ] **Step 6: Evolve the server mass-assignment test (it now fails by design)**

Run `npm test -w server` first — expected: the old `"cannot mass-assign protected fields like activities or passwordHash"` test FAILS (activities is now a legitimate field). Replace that single test in `server/tests/users.profile.test.ts` with these two:

```ts
  it("stores validated, deduplicated activities but never passwordHash or username", async () => {
    const agent = request.agent(createApp());
    await agent.post("/api/auth/register").send(creds);
    const res = await agent
      .patch("/api/users/me")
      .send({ activities: ["tennis", "tennis", "yoga"], passwordHash: "owned", username: "hijacked" });
    expect(res.status).toBe(200);
    expect(res.body.user.activities).toEqual(["tennis", "yoga"]);
    const user = await User.findOne({ username: "andrei" });
    expect(user?.username).toBe("andrei");
    expect(user?.activities).toEqual(["tennis", "yoga"]);
    expect(user?.passwordHash).toMatch(/^\$2/);
  });

  it("rejects activities outside the catalogue", async () => {
    const agent = request.agent(createApp());
    await agent.post("/api/auth/register").send(creds);
    const res = await agent.patch("/api/users/me").send({ activities: ["hacked"] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
```

- [ ] **Step 7: Run server tests**

Run: `npm test -w server`
Expected: PASS — 19 tests (18 − 1 replaced + 2 new). `npm run build -w server` clean.

- [ ] **Step 8: Commit**

```bash
git add shared server
git commit -m "feat(shared): activity catalogue with validated profile activities field"
```

---

### Task 2: GET /api/users/search

**Files:**
- Create: `server/src/middleware/validateQuery.ts`
- Modify: `server/src/routes/users.ts`
- Test: `server/tests/users.search.test.ts`

**Interfaces:**
- Consumes: `searchUsersQuerySchema`, `SearchUsersQuery` from shared; `requireAuth`, `AppError`, `User`, `UserFields`, `toPublicUser`, `setupTestDb` from Phase 1.
- Produces: `GET /api/users/search?activity=&city=` → `{ users: PublicUser[] }` (Task 6's client calls it); `validateQuery(schema)` middleware that puts parsed data on `res.locals.query` (Express 5's `req.query` is a read-only getter, so it cannot be reassigned like `req.body`).

- [ ] **Step 1: Write the failing test `server/tests/users.search.test.ts`**

```ts
import type { Express } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { setupTestDb } from "./helpers";

setupTestDb();

async function createUser(
  app: Express,
  username: string,
  profile: { city?: string; activities?: string[] },
): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send({ username, password: "Secret1" });
  await agent.patch("/api/users/me").send(profile);
  return agent;
}

describe("GET /api/users/search", () => {
  it("filters by activity, excludes the requester, and sorts by username", async () => {
    const app = createApp();
    const me = await createUser(app, "mira", { city: "Sofia", activities: ["tennis"] });
    await createUser(app, "bob", { city: "Sofia", activities: ["tennis"] });
    await createUser(app, "anna", { city: "Plovdiv", activities: ["tennis", "yoga"] });
    await createUser(app, "cara", { city: "Sofia", activities: ["yoga"] });

    const res = await me.get("/api/users/search?activity=tennis");
    expect(res.status).toBe(200);
    expect(res.body.users.map((u: { username: string }) => u.username)).toEqual(["anna", "bob"]);
  });

  it("matches city case-insensitively", async () => {
    const app = createApp();
    const me = await createUser(app, "mira", {});
    await createUser(app, "bob", { city: "Sofia" });
    await createUser(app, "anna", { city: "Plovdiv" });

    const res = await me.get("/api/users/search?city=sofia");
    expect(res.status).toBe(200);
    expect(res.body.users.map((u: { username: string }) => u.username)).toEqual(["bob"]);
  });

  it("combines activity and city with AND", async () => {
    const app = createApp();
    const me = await createUser(app, "mira", {});
    await createUser(app, "bob", { city: "Sofia", activities: ["tennis"] });
    await createUser(app, "anna", { city: "Plovdiv", activities: ["tennis"] });
    await createUser(app, "cara", { city: "Sofia", activities: ["yoga"] });

    const res = await me.get("/api/users/search?activity=tennis&city=Sofia");
    expect(res.body.users.map((u: { username: string }) => u.username)).toEqual(["bob"]);
  });

  it("returns all other users when no filters are given", async () => {
    const app = createApp();
    const me = await createUser(app, "mira", {});
    await createUser(app, "bob", {});
    await createUser(app, "anna", {});

    const res = await me.get("/api/users/search");
    expect(res.body.users.map((u: { username: string }) => u.username)).toEqual(["anna", "bob"]);
  });

  it("treats a regex-special city literally", async () => {
    const app = createApp();
    const me = await createUser(app, "mira", {});
    await createUser(app, "bob", { city: "Sofia" });

    const res = await me.get(`/api/users/search?city=${encodeURIComponent(".*")}`);
    expect(res.status).toBe(200);
    expect(res.body.users).toEqual([]);
  });

  it("rejects an unknown activity key with 400", async () => {
    const app = createApp();
    const me = await createUser(app, "mira", {});
    const res = await me.get("/api/users/search?activity=quidditch");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("requires authentication", async () => {
    const res = await request(createApp()).get("/api/users/search");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -w server`
Expected: FAIL — the new file's requests hit 404 (route missing); all other suites stay green.

- [ ] **Step 3: Write `server/src/middleware/validateQuery.ts`**

```ts
import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "../errors";

/**
 * Query-param twin of validate(): Express 5 exposes req.query through a
 * read-only getter, so the parsed result goes to res.locals.query instead.
 */
export function validateQuery(schema: ZodType): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(new AppError(400, "VALIDATION_ERROR", result.error.issues[0]?.message ?? "Invalid input"));
      return;
    }
    res.locals.query = result.data;
    next();
  };
}
```

- [ ] **Step 4: Add the route to `server/src/routes/users.ts`**

Update the imports and append the route (final file shown in full):

```ts
import { searchUsersQuerySchema, updateProfileInputSchema, type SearchUsersQuery, type UpdateProfileInput } from "@sports-match/shared";
import { Router } from "express";
import type { FilterQuery } from "mongoose";
import { AppError } from "../errors";
import { requireAuth } from "../middleware/requireAuth";
import { validate } from "../middleware/validate";
import { validateQuery } from "../middleware/validateQuery";
import { toPublicUser, User, type UserFields } from "../models/User";

export const usersRouter = Router();

// Documented cap (see phase 2 spec): no pagination yet at current scale.
const SEARCH_RESULT_CAP = 50;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

usersRouter.patch("/me", requireAuth, validate(updateProfileInputSchema), async (req, res) => {
  const updates = req.body as UpdateProfileInput;
  const user = await User.findByIdAndUpdate(req.session.userId, { $set: updates }, { new: true });
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "You must be logged in");
  }
  res.json({ user: toPublicUser(user) });
});

usersRouter.get("/search", requireAuth, validateQuery(searchUsersQuerySchema), async (req, res) => {
  // Express 5's req.query is a read-only getter; validateQuery parks the parsed result here.
  const { activity, city } = res.locals.query as SearchUsersQuery;
  const filter: FilterQuery<UserFields> = { _id: { $ne: req.session.userId } };
  if (activity) {
    filter.activities = activity;
  }
  if (city) {
    filter.city = { $regex: `^${escapeRegExp(city)}$`, $options: "i" };
  }
  const users = await User.find(filter).sort({ username: 1 }).limit(SEARCH_RESULT_CAP);
  res.json({ users: users.map(toPublicUser) });
});
```

Check `server/src/models/User.ts` exports `UserFields` (it does — Phase 1 defined `export interface UserFields`).

- [ ] **Step 5: Run tests**

Run: `npm test -w server`
Expected: PASS — 26 tests (19 + 7 new). `npm run build -w server` clean.

- [ ] **Step 6: Commit**

```bash
git add server
git commit -m "feat(server): buddy search endpoint with activity and city filters"
```

---

### Task 3: Client foundation — ported assets, typed hook, catalogue join, Activity components

**Files:**
- Port from prototype branch: `src/images/activitiesPage/` (40 images), `src/pages/Activities/Activities.scss`, `src/pages/BuddySearch/BuddySearch.scss`, `src/components/Activity/Activity.scss`, `src/components/BuddyCard/BuddyCard.scss` — all landing under `client/src/` at mirrored paths
- Create: `client/src/components/Utils/Debounce.ts`, `client/src/activities/catalogue.ts`, `client/src/components/Activity/Activity.tsx`
- Test: `client/src/activities/catalogue.test.ts`

**Interfaces:**
- Consumes: `ACTIVITIES`, `ActivityKey` from `@sports-match/shared`.
- Produces (Tasks 4–6 import these):
  - `useDebounce<T>(value: T, delay: number): T` (default export of `Debounce.ts`)
  - `ClientActivity { key: ActivityKey; label: string; image: string }`, `CLIENT_ACTIVITIES: ClientActivity[]`, `activityByKey(key: string): ClientActivity | undefined`
  - `ActivityComponent({ activity, onAdd?, added?, onRemove? })`, `ActivityComponentCircle({ activity, onRemove? })` (named exports)

- [ ] **Step 1: Port assets and styles from the prototype branch**

```bash
git checkout prototype -- \
  src/images/activitiesPage \
  src/pages/Activities/Activities.scss \
  src/pages/BuddySearch/BuddySearch.scss \
  src/components/Activity/Activity.scss \
  src/components/BuddyCard/BuddyCard.scss
mkdir -p client/src/pages/Activities client/src/pages/BuddySearch client/src/components/Activity client/src/components/BuddyCard
cp -r src/images/activitiesPage client/src/images/
cp src/pages/Activities/Activities.scss client/src/pages/Activities/
cp src/pages/BuddySearch/BuddySearch.scss client/src/pages/BuddySearch/
cp src/components/Activity/Activity.scss client/src/components/Activity/
cp src/components/BuddyCard/BuddyCard.scss client/src/components/BuddyCard/
rm -rf src
git add -A
```
Expected: `git status` shows the new files under `client/src/` only; no top-level `src/` remains.

- [ ] **Step 2: Write the failing test `client/src/activities/catalogue.test.ts`**

```ts
import { ACTIVITIES } from "@sports-match/shared";
import { describe, expect, it } from "vitest";
import { CLIENT_ACTIVITIES, activityByKey } from "./catalogue";

describe("client activity catalogue", () => {
  it("maps every shared activity key to an image", () => {
    expect(CLIENT_ACTIVITIES).toHaveLength(ACTIVITIES.length);
    for (const activity of CLIENT_ACTIVITIES) {
      expect(activity.image, `missing image for ${activity.key}`).toBeTruthy();
      expect(activity.label).toBeTruthy();
    }
  });

  it("looks up activities by key and returns undefined for unknown keys", () => {
    expect(activityByKey("tennis")?.label).toBe("Tennis");
    expect(activityByKey("quidditch")).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npm test -w client`
Expected: FAIL — `Cannot find module './catalogue'`.

- [ ] **Step 4: Write `client/src/activities/catalogue.ts`**

The image-file joins below preserve the prototype's exact pairings (note the quirks: Kayak→canoe.png, Snooker→billiards.png, Horse riding→equestrianism.png, Roller skating→skating.png, Basketball→basketball2.png, Badminton→badminton1.png):

```ts
import { ACTIVITIES, type ActivityKey } from "@sports-match/shared";
import archery from "../images/activitiesPage/archery.png";
import badminton from "../images/activitiesPage/badminton1.png";
import baseball from "../images/activitiesPage/baseball.png";
import basketball from "../images/activitiesPage/basketball2.png";
import snooker from "../images/activitiesPage/billiards.png";
import bowling from "../images/activitiesPage/bowling.png";
import boxing from "../images/activitiesPage/boxing.png";
import kayak from "../images/activitiesPage/canoe.png";
import curling from "../images/activitiesPage/curling.png";
import cycling from "../images/activitiesPage/cycling.png";
import dance from "../images/activitiesPage/dance.png";
import horseRiding from "../images/activitiesPage/equestrianism.png";
import fencing from "../images/activitiesPage/fencing.png";
import fitness from "../images/activitiesPage/fitness.png";
import football from "../images/activitiesPage/football.png";
import golf from "../images/activitiesPage/golf.png";
import hockey from "../images/activitiesPage/hockey.png";
import iceSkating from "../images/activitiesPage/iceSkating.png";
import karting from "../images/activitiesPage/karting.png";
import martialArts from "../images/activitiesPage/martialArts.png";
import motorcycling from "../images/activitiesPage/motorcycling.png";
import padel from "../images/activitiesPage/padel.png";
import paintball from "../images/activitiesPage/paintball.png";
import petanka from "../images/activitiesPage/petanka.webp";
import poleDance from "../images/activitiesPage/poledance.png";
import pool from "../images/activitiesPage/pool.png";
import rafting from "../images/activitiesPage/rafting.png";
import running from "../images/activitiesPage/running.png";
import rollerSkating from "../images/activitiesPage/skating.png";
import ski from "../images/activitiesPage/ski.png";
import snowboard from "../images/activitiesPage/snowboard.png";
import squash from "../images/activitiesPage/squash.png";
import swimming from "../images/activitiesPage/swimming.png";
import tableTennis from "../images/activitiesPage/tableTennis.png";
import tennis from "../images/activitiesPage/tennis.png";
import trampolines from "../images/activitiesPage/trampolines.png";
import volleyball from "../images/activitiesPage/volleyball.png";
import wallClimbing from "../images/activitiesPage/wallClimbing.png";
import darts from "../images/activitiesPage/darts.png";
import yoga from "../images/activitiesPage/yoga.png";

const ACTIVITY_IMAGES: Record<ActivityKey, string> = {
  tennis,
  "table-tennis": tableTennis,
  badminton,
  football,
  squash,
  running,
  basketball,
  volleyball,
  ski,
  snowboard,
  "ice-skating": iceSkating,
  padel,
  "wall-climbing": wallClimbing,
  darts,
  paintball,
  snooker,
  bowling,
  karting,
  dance,
  pool,
  golf,
  fitness,
  boxing,
  "pole-dance": poleDance,
  baseball,
  fencing,
  cycling,
  motorcycling,
  rafting,
  kayak,
  curling,
  petanka,
  swimming,
  "martial-arts": martialArts,
  "horse-riding": horseRiding,
  hockey,
  "roller-skating": rollerSkating,
  yoga,
  trampolines,
  archery,
};

export interface ClientActivity {
  key: ActivityKey;
  label: string;
  image: string;
}

export const CLIENT_ACTIVITIES: ClientActivity[] = ACTIVITIES.map((a) => ({
  key: a.key,
  label: a.label,
  image: ACTIVITY_IMAGES[a.key],
}));

export function activityByKey(key: string): ClientActivity | undefined {
  return CLIENT_ACTIVITIES.find((a) => a.key === key);
}
```

- [ ] **Step 5: Write `client/src/components/Utils/Debounce.ts`** (typed port of the prototype hook)

```ts
import { useEffect, useState } from "react";

export default function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

- [ ] **Step 6: Write `client/src/components/Activity/Activity.tsx`** (typed port; prototype JSX/classNames preserved, `activity.name` → `activity.label`)

```tsx
import type { ClientActivity } from "../../activities/catalogue";
import "./Activity.scss";

interface ActivityComponentProps {
  activity: ClientActivity;
  onAdd?: (activity: ClientActivity) => void;
  added?: boolean;
  onRemove?: (activity: ClientActivity) => void;
}

function ActivityComponent({ activity, onAdd, added, onRemove }: ActivityComponentProps) {
  const addButtonText = added ? "Remove" : "Add";

  return (
    <div className="activityContainerSquare">
      <h2>{activity.label}</h2>
      <img src={activity.image} alt={activity.label} />
      {onAdd && (
        <button className={added ? "addedButton" : "addButton"} onClick={() => onAdd(activity)}>
          {addButtonText}
        </button>
      )}
      {onRemove && (
        <button className="removeButton" onClick={() => onRemove(activity)}>
          X
        </button>
      )}
    </div>
  );
}

interface ActivityComponentCircleProps {
  activity: ClientActivity;
  onRemove?: (activity: ClientActivity) => void;
}

function ActivityComponentCircle({ activity, onRemove }: ActivityComponentCircleProps) {
  return (
    <div className="activityContainerCircle">
      {onRemove && (
        <button className="smallBtn" onClick={() => onRemove(activity)}>
          X
        </button>
      )}
      <img src={activity.image} alt={activity.label} />
    </div>
  );
}

export { ActivityComponent, ActivityComponentCircle };
```

- [ ] **Step 7: Run tests and build**

Run: `npm test -w client`
Expected: PASS — 9 tests (7 + 2 new). Then `npm run build -w client` — clean (`.webp` is a standard Vite asset type; no config needed).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(client): activity catalogue join, typed debounce and activity components, ported assets"
```

---

### Task 4: Activities page

**Files:**
- Create: `client/src/pages/Activities/Activities.tsx`
- Modify: `client/src/App.tsx` (swap the ComingSoon route)

**Interfaces:**
- Consumes: `CLIENT_ACTIVITIES`, `ClientActivity`, `ActivityComponent`, `useDebounce` (Task 3); `useAuth().user/updateProfile` (Phase 1); `CustomAlert`.
- Produces: `/activities` renders the real page. Change vs prototype (intentional, per spec): the LoginModal dance is gone (route already inside `RequireAuth`); Add/Remove persists via `PATCH /api/users/me`.

- [ ] **Step 1: Write `client/src/pages/Activities/Activities.tsx`**

```tsx
import type { UpdateProfileInput } from "@sports-match/shared";
import { useState } from "react";
import { CLIENT_ACTIVITIES, type ClientActivity } from "../../activities/catalogue";
import { ActivityComponent } from "../../components/Activity/Activity";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import useDebounce from "../../components/Utils/Debounce";
import { useAuth } from "../../context/AuthContext";
import "../../sweetalert2-custom.scss";
import "./Activities.scss";

const sortedActivities = [...CLIENT_ACTIVITIES].sort((a, b) => a.label.localeCompare(b.label));

export default function ActivitiesPage() {
  const { user, updateProfile } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [error, setError] = useState("");
  const debouncedSearchInput = useDebounce(searchInput, 300);

  if (!user) {
    return null; // RequireAuth guarantees a user; this narrows the type.
  }

  const addedKeys = new Set(user.activities);

  const handleToggleActivity = async (activity: ClientActivity) => {
    const next = addedKeys.has(activity.key)
      ? user.activities.filter((key) => key !== activity.key)
      : [...user.activities, activity.key];
    try {
      // user.activities is string[] on the wire but only ever holds server-validated catalogue keys.
      await updateProfile({ activities: next as UpdateProfileInput["activities"] });
      setError("");
    } catch {
      setError("Could not update your activities. Please try again.");
    }
  };

  return (
    <div className="activitiesPageContainer">
      <div className="titleWrapper">
        <h2 className="siteNameTitle">
          ADD favorite sports to your profile so that other people can find you
        </h2>
      </div>
      {error && <CustomAlert variant="danger" message={error} />}
      <div className="searchContainer">
        <label htmlFor="activitySearch"></label>
        <input
          id="activitySearch"
          type="text"
          value={searchInput}
          placeholder="Search for sport"
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>
      <div className="activitiesContainer">
        {sortedActivities
          .filter((activity) => activity.label.toLowerCase().includes(debouncedSearchInput.toLowerCase()))
          .map((activity) => (
            <ActivityComponent
              key={activity.key}
              activity={activity}
              onAdd={handleToggleActivity}
              added={addedKeys.has(activity.key)}
            />
          ))}
      </div>
    </div>
  );
}
```
(Note: the prototype passed `className="activity"` to ActivityComponent, which ignored it — omitted here, same as Phase 1's HomeCard precedent.)

- [ ] **Step 2: Swap the route in `client/src/App.tsx`**

Add the import:
```tsx
import ActivitiesPage from "./pages/Activities/Activities";
```
Change the activities route inside the RequireAuth group from
```tsx
          <Route path="/activities" element={<ComingSoon feature="Activities" />} />
```
to
```tsx
          <Route path="/activities" element={<ActivitiesPage />} />
```

- [ ] **Step 3: Verify**

Run: `npm test -w client` (9 passing, unchanged) and `npm run build -w client` (clean). Then `npm run dev:memory` in the background; with curl confirm the SPA still serves (`curl -s http://localhost:3000/ | head -3`) and the API is up (`curl -s http://localhost:4000/api/health`); kill the servers. Grid rendering is judged in the human click-through.

- [ ] **Step 4: Commit**

```bash
git add client
git commit -m "feat(client): activities page persisting sport selection through the api"
```

---

### Task 5: Profile activity circles

**Files:**
- Modify: `client/src/pages/Profile/Profile.tsx` (imports + activities section only)

**Interfaces:**
- Consumes: `ActivityComponentCircle`, `activityByKey` (Task 3), `ConfirmModal` (Phase 1), existing `useAuth().updateProfile` and the page's `setError`.
- Produces: profile page shows activity images with ✕ remove (prototype look restored). Change vs prototype (intentional): removal persists via PATCH; unknown keys (impossible via API, defensive) render nothing.

- [ ] **Step 1: Update imports in `client/src/pages/Profile/Profile.tsx`**

Add:
```tsx
import { activityByKey } from "../../activities/catalogue";
import { ActivityComponentCircle } from "../../components/Activity/Activity";
import ConfirmModal from "../../components/Modals/ConfirmModal";
```

- [ ] **Step 2: Add the removal handler** (place after `handleImageChange`)

```tsx
  const handleRemoveActivity = async (activityKey: string) => {
    const shouldRemove = await ConfirmModal(
      "Do you really want to remove this activity?",
      "This action cannot be undone.",
    );
    if (!shouldRemove) {
      return;
    }
    try {
      const next = user.activities.filter((key) => key !== activityKey);
      // user.activities is string[] on the wire but only ever holds server-validated catalogue keys.
      await updateProfile({ activities: next as UpdateProfileInput["activities"] });
      setError("");
    } catch {
      setError("Could not update your activities. Please try again.");
    }
  };
```

- [ ] **Step 3: Replace the activities section JSX**

Replace
```tsx
          <div className="activitiesList">
            {user.activities.map((activity) => (
              <div key={activity}>{activity}</div>
            ))}
          </div>
```
with
```tsx
          <div className="activitiesList">
            {user.activities.map((key) => {
              const activity = activityByKey(key);
              return activity ? (
                <div key={key}>
                  <ActivityComponentCircle activity={activity} onRemove={() => handleRemoveActivity(key)} />
                </div>
              ) : null;
            })}
          </div>
```

- [ ] **Step 4: Verify and commit**

Run: `npm test -w client` (9 passing) and `npm run build -w client` (clean).
```bash
git add client
git commit -m "feat(client): profile activity circles with confirm-remove, prototype look restored"
```

---

### Task 6: Buddy search — API client, BuddyCard, page, route

**Files:**
- Create: `client/src/components/BuddyCard/BuddyCard.tsx`, `client/src/pages/BuddySearch/BuddySearch.tsx`
- Modify: `client/src/api/users.ts` (add searchUsers), `client/src/App.tsx` (swap route)
- Test: `client/src/api/users.test.ts`

**Interfaces:**
- Consumes: `PublicUser`, `ActivityKey` from shared; `activityByKey`, `CLIENT_ACTIVITIES`, `useDebounce` (Task 3); `useAuth().user`; `request` wrapper; `GET /api/users/search` (Task 2).
- Produces: `usersApi.searchUsers(params: { activity?: ActivityKey; city?: string }): Promise<PublicUser[]>`; `/buddySearch` renders the real page. Changes vs prototype (intentional, per spec): server-side search replaces client filtering; new city input pre-filled with the user's city (clearable, debounced), styled with the existing `buddySearchSelect` class; fetch on mount with the pre-filled filters; Start Chat still navigates to `/messages` with `state.receiver` (ComingSoon until Phase 3).

- [ ] **Step 1: Write the failing test `client/src/api/users.test.ts`**

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { searchUsers } from "./users";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("searchUsers", () => {
  it("builds the query string from defined params only", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ users: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await searchUsers({ activity: "tennis", city: "Sofia" });
    expect(fetchMock).toHaveBeenCalledWith("/api/users/search?activity=tennis&city=Sofia", expect.anything());

    await searchUsers({});
    expect(fetchMock).toHaveBeenLastCalledWith("/api/users/search", expect.anything());
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -w client`
Expected: FAIL — `searchUsers` is not exported.

- [ ] **Step 3: Extend `client/src/api/users.ts`**

```ts
import type { ActivityKey, PublicUser, UpdateProfileInput } from "@sports-match/shared";
import { request } from "./http";

export async function updateProfile(input: UpdateProfileInput): Promise<PublicUser> {
  const res = await request<{ user: PublicUser }>("/api/users/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return res.user;
}

export interface SearchUsersParams {
  activity?: ActivityKey;
  city?: string;
}

export async function searchUsers(params: SearchUsersParams): Promise<PublicUser[]> {
  const query = new URLSearchParams();
  if (params.activity) {
    query.set("activity", params.activity);
  }
  if (params.city) {
    query.set("city", params.city);
  }
  const qs = query.toString();
  const res = await request<{ users: PublicUser[] }>(`/api/users/search${qs ? `?${qs}` : ""}`);
  return res.users;
}
```

- [ ] **Step 4: Write `client/src/components/BuddyCard/BuddyCard.tsx`** (typed port; keys render as labels)

```tsx
import type { PublicUser } from "@sports-match/shared";
import { activityByKey } from "../../activities/catalogue";
import "./BuddyCard.scss";

interface BuddyCardProps {
  user: PublicUser;
  defaultImage: string;
  onStartChat: (user: PublicUser) => void;
}

export default function BuddyCard({ user, defaultImage, onStartChat }: BuddyCardProps) {
  const activityLabels = user.activities.map((key) => activityByKey(key)?.label ?? key).join(", ");

  return (
    <div className="box">
      <div className="imgBx">
        <img src={user.image || defaultImage} alt={user.username} />
      </div>
      <div className="content">
        <h3>
          {user.username} <br></br>
          <span>
            Favourite activities: {activityLabels} <br></br>
          </span>
          <button className="chatBtn" onClick={() => onStartChat(user)}>
            Start Chat
          </button>
        </h3>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Write `client/src/pages/BuddySearch/BuddySearch.tsx`**

```tsx
import type { PublicUser } from "@sports-match/shared";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CLIENT_ACTIVITIES } from "../../activities/catalogue";
import * as usersApi from "../../api/users";
import BuddyCard from "../../components/BuddyCard/BuddyCard";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import useDebounce from "../../components/Utils/Debounce";
import { useAuth } from "../../context/AuthContext";
import userImage from "../../images/user.png";
import "./BuddySearch.scss";

const sortedActivities = [...CLIENT_ACTIVITIES].sort((a, b) => a.label.localeCompare(b.label));

export default function BuddySearchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedActivity, setSelectedActivity] = useState("");
  const [city, setCity] = useState(user?.city ?? "");
  const [buddies, setBuddies] = useState<PublicUser[]>([]);
  const [error, setError] = useState("");
  const debouncedCity = useDebounce(city, 300);

  useEffect(() => {
    let cancelled = false;
    usersApi
      .searchUsers({
        // Select options come from the catalogue, so the value is a valid key or "".
        activity: (selectedActivity || undefined) as usersApi.SearchUsersParams["activity"],
        city: debouncedCity.trim() || undefined,
      })
      .then((results) => {
        if (!cancelled) {
          setBuddies(results);
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load buddies. Please try again.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedActivity, debouncedCity]);

  const handleStartChat = (otherUser: PublicUser) => {
    navigate("/messages", { state: { receiver: otherUser.username } });
  };

  return (
    <div className="buddyPage">
      <h2 className="siteSloganTitle">Find someone that shares your sport passion</h2>
      <div className="buddySearchWrapper">
        <select
          className="buddySearchSelect"
          id="activity-select"
          value={selectedActivity}
          onChange={(e) => setSelectedActivity(e.target.value)}
        >
          <option value="">Search buddy by activity</option>
          {sortedActivities.map((activity) => (
            <option key={activity.key} value={activity.key}>
              {activity.label}
            </option>
          ))}
        </select>
        <input
          className="buddySearchSelect"
          type="text"
          value={city}
          placeholder="City"
          onChange={(e) => setCity(e.target.value)}
        />
      </div>
      {error && <CustomAlert variant="danger" message={error} />}
      <div className="buddiesHolder">
        {buddies.map((buddy) => (
          <div className="buddyCardContainer" key={buddy.username}>
            <BuddyCard user={buddy} defaultImage={userImage} onStartChat={handleStartChat} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Swap the route in `client/src/App.tsx`**

Add the import:
```tsx
import BuddySearchPage from "./pages/BuddySearch/BuddySearch";
```
Change
```tsx
          <Route path="/buddySearch" element={<ComingSoon feature="Buddy Search" />} />
```
to
```tsx
          <Route path="/buddySearch" element={<BuddySearchPage />} />
```
(`ComingSoon` stays imported — Messages and Places still use it.)

- [ ] **Step 7: Run tests and build**

Run: `npm test -w client`
Expected: PASS — 10 tests (9 + 1 new). `npm run build -w client` clean.

- [ ] **Step 8: Commit**

```bash
git add client
git commit -m "feat(client): buddy search page with activity and city filters against the real api"
```

---

### Task 7: Final verification, README roadmap, push

**Files:**
- Modify: `README.md` (roadmap section only)

**Interfaces:** consumes everything; produces the verified, pushed Phase 2.

- [ ] **Step 1: Update the README roadmap**

Change
```markdown
1. ✅ Auth + profiles (this phase)
2. Activities + buddy search
3. Real-time chat (Socket.io)
4. Places catalogue with geo search
```
to
```markdown
1. ✅ Auth + profiles
2. ✅ Activities + buddy search
3. Real-time chat (Socket.io)
4. Places catalogue with geo search
```

- [ ] **Step 2: Full verification**

Run: `npm test` (expect: shared 14, server 26, client 10 — 50 total, all green) and `npm run build` (all three clean).

- [ ] **Step 3: End-to-end curl flow (the spec's success criterion, API level)**

Run `npm run dev:memory` in the background; wait for both servers. Then:
```bash
# User A: anna in Sofia, plays tennis
curl -s -c /tmp/p2a -H "Content-Type: application/json" -d '{"username":"anna","password":"Secret1"}' http://localhost:3000/api/auth/register
curl -s -b /tmp/p2a -X PATCH -H "Content-Type: application/json" -d '{"city":"Sofia","activities":["tennis"]}' http://localhost:3000/api/users/me
# User B: bob searches tennis in sofia (case-insensitive) -> finds anna
curl -s -c /tmp/p2b -H "Content-Type: application/json" -d '{"username":"bob","password":"Secret1"}' http://localhost:3000/api/auth/register
curl -s -b /tmp/p2b "http://localhost:3000/api/users/search?activity=tennis&city=sofia"
# Anna removes tennis -> bob's search is empty
curl -s -b /tmp/p2a -X PATCH -H "Content-Type: application/json" -d '{"activities":[]}' http://localhost:3000/api/users/me
curl -s -b /tmp/p2b "http://localhost:3000/api/users/search?activity=tennis&city=sofia"
```
Expected: first search returns anna's public user (with `"activities":["tennis"]`); second returns `{"users":[]}`. Kill the servers.

- [ ] **Step 4: Commit and push**

```bash
git add README.md
git commit -m "feat: phase 2 complete — activities selection and buddy search"
git push
```

**Human click-through items (report, don't perform):** activities grid renders with images and Add/Remove toggling; profile circles show images with ✕ confirm-remove; buddy search first view shows "people in my city", filters work, Start Chat lands on the Messages placeholder.

---

## Out of scope (deliberate, per spec)

- Chat (Phase 3), places (Phase 4), pagination, geo distance, match scoring.
- Username charset/case normalization (deferred from Phase 1 review).
- Activity catalogue admin UI — the catalogue is code.
