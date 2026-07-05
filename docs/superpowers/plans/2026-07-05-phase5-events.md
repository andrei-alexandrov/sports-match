# Phase 5 — Events (Trainers + Social) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trainers create training events with open slots; anyone creates social events; one Events page to discover and join them.

**Architecture:** Same three-layer pattern as every phase: Zod contract in `shared/`, Mongoose model + Express routes in `server/` (join is a single atomic update), Orbit-styled client page + API wrapper. User gains a self-declared `trainer` flag.

**Tech Stack:** Zod v4, Express 5 + Mongoose 8, React 18 + Vite, Vitest/supertest/mongodb-memory-server, Orbit tokens/mixins.

**Spec:** `docs/superpowers/specs/2026-07-05-phase5-events-design.md` (baseline `c81d42e`, 109 tests: 29 shared / 56 server / 24 client). Full autonomy granted — no user gates.

## Global Constraints

- TypeScript strict, zero `any` (sanctioned commented casts only: `res.locals.query as X`, `req.body as X`, `.lean<T>()`).
- Error envelope `{ error: { code, message } }`; codes used here: VALIDATION_ERROR 400, UNAUTHORIZED 401, FORBIDDEN 403, NOT_FOUND 404, and 409s EVENT_FULL / ALREADY_JOINED / EVENT_STARTED / EVENT_CANCELLED / NOT_JOINED / HOST_CANNOT_LEAVE.
- `type: "training"` requires the creator's `trainer` flag (server-enforced 403). Price only on training events (schema refine). Venue: `placeId` OR `locationText`, at least one (schema refine). `startsAt` must parse to a future date.
- Social events auto-add the host to `participants` at creation; training events never include the host in `participants`.
- Join = ONE atomic `updateOne` whose filter checks: active, not started, not already joined, `$size(participants) < capacity`. Typed 409 discrimination via one follow-up read.
- GET returns upcoming events only (`startsAt > now`), ascending, cap `EVENTS_RESULT_CAP = 100` with comment `// Documented cap (see phase 5 spec): no pagination at current scale.`; cancelled events visible ONLY to their host/participants.
- Client: Orbit tokens/mixins only; pills/cards/focus-rings per system; scanning-Radar empty state; no text-shadows; mobile-first.
- Existing page logic untouched except where a step explicitly adds UI (Profile edit flow, BuddyCard, NavBar) — bind existing handlers, follow the file's patterns.
- All 109 existing tests stay green after every task; workspace commands `npm test -w shared|server|client` from repo root.

## File Structure

| Unit | Files |
|---|---|
| Contract | `shared/src/events.ts` (+ re-export in `shared/src/index.ts`), `shared/src/schemas.ts` (trainer fields), tests |
| Server users | `server/src/models/User.ts` (trainer fields), `server/tests/users.trainer.test.ts` |
| Server events | `server/src/models/Event.ts`, `server/src/routes/events.ts`, `server/src/app.ts` (mount), `server/tests/events.create.test.ts`, `server/tests/events.membership.test.ts` |
| Client data | `client/src/api/events.ts` (+ test), `client/src/pages/Events/formatEventDate.ts` (+ test), `client/src/pages/Events/eventCardState.ts` (+ test) |
| Client UI | `client/src/pages/Events/Events.tsx` + `Events.scss`, `client/src/App.tsx` (route), `client/src/components/NavBar/NavBar.tsx` (link), `client/src/pages/Profile/Profile.tsx` (+scss; trainer toggle/bio/chip), `client/src/components/BuddyCard/BuddyCard.tsx` (chip) |

---

### Task 1: Shared contract — trainer fields + events schemas

**Files:**
- Create: `shared/src/events.ts`, `shared/src/events.test.ts`
- Modify: `shared/src/schemas.ts` (updateProfileInputSchema + publicUserSchema), `shared/src/index.ts`, `shared/src/schemas.test.ts` (extend)

**Interfaces:**
- Consumes: `activityKeySchema` from `./activities`.
- Produces: `eventTypeSchema`/`EventType`, `createEventInputSchema`/`CreateEventInput`, `publicEventSchema`/`PublicEvent`, `searchEventsQuerySchema`/`SearchEventsQuery`; `PublicUser` gains `trainer: boolean` and `trainerBio: string`; `UpdateProfileInput` gains both as optionals.

- [ ] **Step 1: Write failing tests**

Create `shared/src/events.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { createEventInputSchema, publicEventSchema, searchEventsQuerySchema } from "./events";

function baseInput() {
  return {
    title: "Morning tennis",
    sport: "tennis",
    type: "social",
    locationText: "Борисова градина, корт 3",
    startsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    durationMinutes: 90,
    capacity: 4,
  };
}

describe("createEventInputSchema", () => {
  it("accepts a valid social event with a text location", () => {
    expect(createEventInputSchema.safeParse(baseInput()).success).toBe(true);
  });

  it("accepts a training event with a price and a placeId", () => {
    const input = { ...baseInput(), type: "training", price: "15 lv", placeId: "abc123", locationText: undefined };
    expect(createEventInputSchema.safeParse(input).success).toBe(true);
  });

  it("requires a venue: placeId or locationText", () => {
    const input = { ...baseInput(), locationText: undefined };
    expect(createEventInputSchema.safeParse(input).success).toBe(false);
  });

  it("rejects a price on a social event", () => {
    expect(createEventInputSchema.safeParse({ ...baseInput(), price: "10 lv" }).success).toBe(false);
  });

  it("rejects a start time in the past", () => {
    const input = { ...baseInput(), startsAt: new Date(Date.now() - 1000).toISOString() };
    expect(createEventInputSchema.safeParse(input).success).toBe(false);
  });

  it("rejects an unparseable start time", () => {
    expect(createEventInputSchema.safeParse({ ...baseInput(), startsAt: "not-a-date" }).success).toBe(false);
  });

  it("enforces capacity and duration bounds", () => {
    expect(createEventInputSchema.safeParse({ ...baseInput(), capacity: 1 }).success).toBe(false);
    expect(createEventInputSchema.safeParse({ ...baseInput(), capacity: 101 }).success).toBe(false);
    expect(createEventInputSchema.safeParse({ ...baseInput(), durationMinutes: 10 }).success).toBe(false);
    expect(createEventInputSchema.safeParse({ ...baseInput(), durationMinutes: 500 }).success).toBe(false);
  });

  it("enforces title bounds", () => {
    expect(createEventInputSchema.safeParse({ ...baseInput(), title: "ab" }).success).toBe(false);
    expect(createEventInputSchema.safeParse({ ...baseInput(), title: "x".repeat(81) }).success).toBe(false);
  });
});

describe("searchEventsQuerySchema", () => {
  it("accepts empty, type, and sport; rejects unknown values", () => {
    expect(searchEventsQuerySchema.safeParse({}).success).toBe(true);
    expect(searchEventsQuerySchema.safeParse({ type: "training", sport: "tennis" }).success).toBe(true);
    expect(searchEventsQuerySchema.safeParse({ type: "party" }).success).toBe(false);
    expect(searchEventsQuerySchema.safeParse({ sport: "quidditch" }).success).toBe(false);
  });
});

describe("publicEventSchema", () => {
  it("accepts a full event", () => {
    const event = {
      id: "e1",
      title: "Morning tennis",
      sport: "tennis",
      type: "training",
      description: null,
      host: "coach",
      hostTrainer: true,
      place: { id: "p1", name: "Тенис клуб Бояна", address: "кв. Бояна, ул. Кумата 6" },
      locationText: null,
      startsAt: new Date().toISOString(),
      durationMinutes: 60,
      capacity: 8,
      participants: ["mira"],
      price: "15 lv",
      status: "active",
    };
    expect(publicEventSchema.safeParse(event).success).toBe(true);
  });
});
```

Extend `shared/src/schemas.test.ts` — add inside the existing `updateProfileInputSchema` describe (or a new one):

```typescript
  it("accepts trainer flag and trainer bio", () => {
    const result = updateProfileInputSchema.safeParse({ trainer: true, trainerBio: "Tennis coach, 10y" });
    expect(result.success).toBe(true);
  });

  it("rejects an over-long trainer bio", () => {
    expect(updateProfileInputSchema.safeParse({ trainerBio: "x".repeat(121) }).success).toBe(false);
  });
```

- [ ] **Step 2: Run to verify failure** — `npm test -w shared` → FAIL (cannot resolve `./events`; trainer fields unknown... strict object? updateProfile schema may currently strip unknown keys — the trainer test then passes vacuously; verify it FAILS by asserting the parsed data contains `trainer: true`; if the schema strips unknowns, adapt the assertion to `result.data` containing the field after implementation).

- [ ] **Step 3: Implement**

Create `shared/src/events.ts`:

```typescript
import { z } from "zod";
import { activityKeySchema } from "./activities";

export const eventTypeSchema = z.enum(["training", "social"]);
export type EventType = z.infer<typeof eventTypeSchema>;

export const createEventInputSchema = z
  .object({
    title: z.string().trim().min(3, "Title is too short").max(80, "Title is too long"),
    sport: activityKeySchema,
    type: eventTypeSchema,
    description: z.string().trim().max(500, "Description is too long").optional(),
    placeId: z.string().optional(),
    locationText: z.string().trim().min(3, "Location is too short").max(120, "Location is too long").optional(),
    startsAt: z.string().refine((value) => {
      const date = new Date(value);
      return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
    }, "Start time must be in the future"),
    durationMinutes: z.number().int().min(15, "Too short").max(480, "Too long"),
    capacity: z.number().int().min(2, "At least 2 spots").max(100, "At most 100 spots"),
    price: z.string().trim().max(40, "Price is too long").optional(),
  })
  .refine((input) => Boolean(input.placeId) || Boolean(input.locationText), {
    message: "Pick a venue or enter a location",
  })
  .refine((input) => !input.price || input.type === "training", {
    message: "Only training events can have a price",
  });
export type CreateEventInput = z.infer<typeof createEventInputSchema>;

export const publicEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  sport: activityKeySchema,
  type: eventTypeSchema,
  description: z.string().nullable(),
  host: z.string(),
  hostTrainer: z.boolean(),
  place: z.object({ id: z.string(), name: z.string(), address: z.string() }).nullable(),
  locationText: z.string().nullable(),
  startsAt: z.string(),
  durationMinutes: z.number().int(),
  capacity: z.number().int(),
  participants: z.array(z.string()),
  price: z.string().nullable(),
  status: z.enum(["active", "cancelled"]),
});
export type PublicEvent = z.infer<typeof publicEventSchema>;

export const searchEventsQuerySchema = z.object({
  type: eventTypeSchema.optional(),
  sport: activityKeySchema.optional(),
});
export type SearchEventsQuery = z.infer<typeof searchEventsQuerySchema>;
```

Modify `shared/src/schemas.ts`: add to `updateProfileInputSchema`'s object (alongside city/age/gender/image/activities):

```typescript
    trainer: z.boolean().optional(),
    trainerBio: z.string().trim().max(120, "Trainer bio is too long").optional(),
```

Add to `publicUserSchema`'s object:

```typescript
  trainer: z.boolean(),
  trainerBio: z.string(),
```

Modify `shared/src/index.ts` — append `export * from "./events";`.

- [ ] **Step 4: Run to verify pass** — `npm test -w shared` → expected 41 (29 + 12 new; report actuals).

- [ ] **Step 5: Commit** — `git add shared && git commit -m "feat(shared): events contract and trainer profile fields"`

---

### Task 2: Server — trainer fields on User

**Files:**
- Modify: `server/src/models/User.ts` (fields + toPublicUser)
- Create: `server/tests/users.trainer.test.ts`

**Interfaces:**
- Consumes: Task 1 schema changes (already in `@sports-match/shared`).
- Produces: `UserFields` gains `trainer: boolean`, `trainerBio: string`; `toPublicUser` emits both. Task 3's routes read `me.trainer`.

- [ ] **Step 1: Failing tests** — create `server/tests/users.trainer.test.ts`:

```typescript
import type { Express } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { setupTestDb } from "./helpers";

setupTestDb();

async function registeredAgent(app: Express, username: string): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send({ username, password: "Secret1" });
  return agent;
}

describe("trainer profile fields", () => {
  it("defaults to non-trainer on register", async () => {
    const app = createApp();
    const me = await registeredAgent(app, "mira");
    const res = await me.get("/api/auth/me");
    expect(res.body.user.trainer).toBe(false);
    expect(res.body.user.trainerBio).toBe("");
  });

  it("round-trips trainer flag and bio through PATCH /api/users/me", async () => {
    const app = createApp();
    const me = await registeredAgent(app, "coach");
    const res = await me.patch("/api/users/me").send({ trainer: true, trainerBio: "Tennis coach, 10y" });
    expect(res.status).toBe(200);
    expect(res.body.user.trainer).toBe(true);
    expect(res.body.user.trainerBio).toBe("Tennis coach, 10y");
    const after = await me.get("/api/auth/me");
    expect(after.body.user.trainer).toBe(true);
  });

  it("rejects an over-long trainer bio", async () => {
    const app = createApp();
    const me = await registeredAgent(app, "coach");
    const res = await me.patch("/api/users/me").send({ trainerBio: "x".repeat(121) });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
```

(If `/api/auth/me` responds with a different shape, read `server/src/routes/auth.ts` and adapt the assertions to the real endpoint — the semantic contract is what matters.)

- [ ] **Step 2: Verify failure** — `npm test -w server -- tests/users.trainer.test.ts` → FAIL (fields undefined).

- [ ] **Step 3: Implement** — in `server/src/models/User.ts` add to `UserFields` and the schema:

```typescript
  trainer: boolean;      // in the interface
  trainerBio: string;
```

```typescript
  trainer: { type: Boolean, default: false },      // in the mongoose schema
  trainerBio: { type: String, default: "" },
```

and in `toPublicUser`'s returned object: `trainer: user.trainer,` and `trainerBio: user.trainerBio,`.

- [ ] **Step 4: Verify pass** — `npm test -w server` → expected 59 (56 + 3), all green including the existing mass-assignment/profile tests.

- [ ] **Step 5: Commit** — `git add server && git commit -m "feat(server): trainer flag and bio on users"`

---

### Task 3: Server — Event model, create, list

**Files:**
- Create: `server/src/models/Event.ts`, `server/src/routes/events.ts`, `server/tests/events.create.test.ts`
- Modify: `server/src/app.ts` (mount `/api/events`)

**Interfaces:**
- Consumes: `createEventInputSchema`/`CreateEventInput`, `searchEventsQuerySchema`/`SearchEventsQuery`, `PublicEvent` (Task 1); `User` + `trainer` (Task 2); `Place`, `PlaceLean` (Phase 4); `requireAuth`, `validate`, `validateQuery`, `AppError`.
- Produces: `Event`, `EventFields`, `EventLean`, `toPublicEvent(event: EventLean): PublicEvent`; routes `POST /api/events`, `GET /api/events`. Task 4 adds membership routes to the SAME router file.

- [ ] **Step 1: Failing tests** — create `server/tests/events.create.test.ts`:

```typescript
import type { Express } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { Event } from "../src/models/Event";
import { seedPlaces } from "../src/seed/places";
import { Place } from "../src/models/Place";
import { setupTestDb } from "./helpers";

setupTestDb();

async function registeredAgent(app: Express, username: string, trainer = false): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send({ username, password: "Secret1" });
  if (trainer) {
    await agent.patch("/api/users/me").send({ trainer: true });
  }
  return agent;
}

function futureIso(hours = 2): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function socialInput() {
  return {
    title: "Evening run",
    sport: "running",
    type: "social",
    locationText: "Южен парк, входа",
    startsAt: futureIso(),
    durationMinutes: 60,
    capacity: 5,
  };
}

describe("POST /api/events", () => {
  it("creates a social event and auto-joins the host", async () => {
    const app = createApp();
    const me = await registeredAgent(app, "mira");
    const res = await me.post("/api/events").send(socialInput());
    expect(res.status).toBe(201);
    expect(res.body.event.host).toBe("mira");
    expect(res.body.event.participants).toEqual(["mira"]);
    expect(res.body.event.type).toBe("social");
    expect(res.body.event.place).toBeNull();
    expect(res.body.event.locationText).toBe("Южен парк, входа");
  });

  it("lets a trainer create a training event with a price at a catalogue place", async () => {
    const app = createApp();
    const coach = await registeredAgent(app, "coach", true);
    await seedPlaces();
    const place = await Place.findOne({ name: "Тенис клуб Бояна" });
    const res = await coach.post("/api/events").send({
      title: "Tennis fundamentals",
      sport: "tennis",
      type: "training",
      placeId: place!.id as string,
      startsAt: futureIso(),
      durationMinutes: 90,
      capacity: 8,
      price: "15 lv",
    });
    expect(res.status).toBe(201);
    expect(res.body.event.hostTrainer).toBe(true);
    expect(res.body.event.participants).toEqual([]);
    expect(res.body.event.place.name).toBe("Тенис клуб Бояна");
    expect(res.body.event.price).toBe("15 lv");
  });

  it("rejects a training event from a non-trainer with 403", async () => {
    const app = createApp();
    const me = await registeredAgent(app, "mira");
    const res = await me.post("/api/events").send({ ...socialInput(), type: "training" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("rejects an unknown placeId with 400", async () => {
    const app = createApp();
    const me = await registeredAgent(app, "mira");
    const res = await me.post("/api/events").send({ ...socialInput(), placeId: "64b000000000000000000000", locationText: undefined });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("requires authentication", async () => {
    const res = await request(createApp()).post("/api/events").send(socialInput());
    expect(res.status).toBe(401);
  });
});

describe("GET /api/events", () => {
  it("lists upcoming events ascending and filters by type and sport", async () => {
    const app = createApp();
    const me = await registeredAgent(app, "mira");
    const coach = await registeredAgent(app, "coach", true);
    await me.post("/api/events").send({ ...socialInput(), title: "Later run", startsAt: futureIso(5) });
    await me.post("/api/events").send({ ...socialInput(), title: "Sooner run", startsAt: futureIso(1) });
    await coach.post("/api/events").send({
      title: "Tennis class", sport: "tennis", type: "training", locationText: "Зала 1",
      startsAt: futureIso(3), durationMinutes: 60, capacity: 6, price: "10 lv",
    });

    const all = await me.get("/api/events");
    expect(all.body.events.map((e: { title: string }) => e.title)).toEqual(["Sooner run", "Tennis class", "Later run"]);

    const training = await me.get("/api/events?type=training");
    expect(training.body.events).toHaveLength(1);

    const running = await me.get("/api/events?sport=running");
    expect(running.body.events).toHaveLength(2);
  });

  it("hides past events", async () => {
    const app = createApp();
    const me = await registeredAgent(app, "mira");
    await Event.create({
      title: "Yesterday run", sport: "running", type: "social", description: null,
      host: "ghost", hostTrainer: false, placeId: null, placeName: null, placeAddress: null,
      locationText: "парк", startsAt: new Date(Date.now() - 60 * 60 * 1000), durationMinutes: 60,
      capacity: 5, participants: ["ghost"], price: null, status: "active",
    });
    const res = await me.get("/api/events");
    expect(res.body.events).toEqual([]);
  });

  it("shows cancelled events only to their host and participants", async () => {
    const app = createApp();
    const host = await registeredAgent(app, "mira");
    const joiner = await registeredAgent(app, "bob");
    const stranger = await registeredAgent(app, "zed");
    const created = await host.post("/api/events").send(socialInput());
    const id = created.body.event.id as string;
    await joiner.post(`/api/events/${id}/join`);
    await host.post(`/api/events/${id}/cancel`);

    expect((await host.get("/api/events")).body.events).toHaveLength(1);
    expect((await joiner.get("/api/events")).body.events).toHaveLength(1);
    expect((await joiner.get("/api/events")).body.events[0].status).toBe("cancelled");
    expect((await stranger.get("/api/events")).body.events).toEqual([]);
  });

  it("rejects an unknown type filter with 400", async () => {
    const app = createApp();
    const me = await registeredAgent(app, "mira");
    const res = await me.get("/api/events?type=party");
    expect(res.status).toBe(400);
  });
});
```

NOTE: the cancelled-visibility test uses `join`/`cancel` routes that Task 4 implements. Include this test file now but add `describe.skip` to ONLY the "shows cancelled events…" test with a `// enabled in the membership task` comment; Task 4 un-skips it.

- [ ] **Step 2: Verify failure** — `npm test -w server -- tests/events.create.test.ts` → FAIL (model/routes missing).

- [ ] **Step 3: Implement the model** — create `server/src/models/Event.ts`:

```typescript
import type { ActivityKey, EventType, PublicEvent } from "@sports-match/shared";
import { ACTIVITY_KEYS } from "@sports-match/shared";
import mongoose from "mongoose";

export interface EventFields {
  title: string;
  sport: ActivityKey;
  type: EventType;
  description: string | null;
  host: string;
  hostTrainer: boolean;
  placeId: string | null;
  placeName: string | null;
  placeAddress: string | null;
  locationText: string | null;
  startsAt: Date;
  durationMinutes: number;
  capacity: number;
  participants: string[];
  price: string | null;
  status: "active" | "cancelled";
}

const eventSchema = new mongoose.Schema<EventFields>({
  title: { type: String, required: true },
  sport: { type: String, enum: [...ACTIVITY_KEYS], required: true },
  type: { type: String, enum: ["training", "social"], required: true },
  description: { type: String, default: null },
  host: { type: String, required: true },
  hostTrainer: { type: Boolean, required: true },
  placeId: { type: String, default: null },
  placeName: { type: String, default: null },
  placeAddress: { type: String, default: null },
  locationText: { type: String, default: null },
  startsAt: { type: Date, required: true },
  durationMinutes: { type: Number, required: true },
  capacity: { type: Number, required: true },
  participants: { type: [String], default: [] },
  price: { type: String, default: null },
  status: { type: String, enum: ["active", "cancelled"], default: "active" },
});
eventSchema.index({ startsAt: 1 });

export const Event = mongoose.model<EventFields>("Event", eventSchema);
export type EventLean = EventFields & { _id: mongoose.Types.ObjectId };

export function toPublicEvent(event: EventLean): PublicEvent {
  return {
    id: event._id.toString(),
    title: event.title,
    sport: event.sport,
    type: event.type,
    description: event.description,
    host: event.host,
    hostTrainer: event.hostTrainer,
    place:
      event.placeId && event.placeName && event.placeAddress
        ? { id: event.placeId, name: event.placeName, address: event.placeAddress }
        : null,
    locationText: event.locationText,
    startsAt: event.startsAt.toISOString(),
    durationMinutes: event.durationMinutes,
    capacity: event.capacity,
    participants: event.participants,
    price: event.price,
    status: event.status,
  };
}
```

- [ ] **Step 4: Implement create + list routes** — create `server/src/routes/events.ts`:

```typescript
import {
  createEventInputSchema,
  searchEventsQuerySchema,
  type CreateEventInput,
  type SearchEventsQuery,
} from "@sports-match/shared";
import { Router } from "express";
import mongoose, { type FilterQuery } from "mongoose";
import { AppError } from "../errors";
import { requireAuth } from "../middleware/requireAuth";
import { validate } from "../middleware/validate";
import { validateQuery } from "../middleware/validateQuery";
import { Event, toPublicEvent, type EventFields, type EventLean } from "../models/Event";
import { Place } from "../models/Place";
import { User } from "../models/User";

export const eventsRouter = Router();

// Documented cap (see phase 5 spec): no pagination at current scale.
const EVENTS_RESULT_CAP = 100;

async function requireUser(userId: string | undefined): Promise<{ username: string; trainer: boolean }> {
  const user = userId ? await User.findById(userId) : null;
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "You must be logged in");
  }
  return { username: user.username, trainer: user.trainer };
}

eventsRouter.post("/", requireAuth, validate(createEventInputSchema), async (req, res) => {
  const input = req.body as CreateEventInput;
  const me = await requireUser(req.session.userId);

  if (input.type === "training" && !me.trainer) {
    throw new AppError(403, "FORBIDDEN", "Only trainers can create training events");
  }

  let placeSnapshot: { placeId: string | null; placeName: string | null; placeAddress: string | null } = {
    placeId: null,
    placeName: null,
    placeAddress: null,
  };
  if (input.placeId) {
    const place = mongoose.isValidObjectId(input.placeId) ? await Place.findById(input.placeId) : null;
    if (!place) {
      throw new AppError(400, "VALIDATION_ERROR", "Unknown place");
    }
    placeSnapshot = { placeId: place.id as string, placeName: place.name, placeAddress: place.address };
  }

  const event = await Event.create({
    title: input.title,
    sport: input.sport,
    type: input.type,
    description: input.description ?? null,
    host: me.username,
    hostTrainer: me.trainer,
    ...placeSnapshot,
    locationText: input.locationText ?? null,
    startsAt: new Date(input.startsAt),
    durationMinutes: input.durationMinutes,
    capacity: input.capacity,
    participants: input.type === "social" ? [me.username] : [],
    price: input.price ?? null,
    status: "active",
  });
  res.status(201).json({ event: toPublicEvent(event.toObject() as EventLean) });
});

eventsRouter.get("/", requireAuth, validateQuery(searchEventsQuerySchema), async (req, res) => {
  // Express 5's req.query is a read-only getter; validateQuery parks the parsed result here.
  const { type, sport } = res.locals.query as SearchEventsQuery;
  const me = await requireUser(req.session.userId);

  const filter: FilterQuery<EventFields> = {
    startsAt: { $gt: new Date() },
    // Cancelled events stay visible only to the people affected by them.
    $or: [{ status: "active" }, { host: me.username }, { participants: me.username }],
  };
  if (type) {
    filter.type = type;
  }
  if (sport) {
    filter.sport = sport;
  }
  const events = await Event.find(filter).sort({ startsAt: 1 }).limit(EVENTS_RESULT_CAP).lean<EventLean[]>();
  res.json({ events: events.map(toPublicEvent) });
});
```

Modify `server/src/app.ts`: import `{ eventsRouter }` and add `app.use("/api/events", eventsRouter);` after the places mount.

- [ ] **Step 5: Verify pass** — `npm test -w server` → expected 68 (59 + 9 new, one skipped shows as skipped; report actuals). All pre-existing suites green.

- [ ] **Step 6: Commit** — `git add server && git commit -m "feat(server): Event model, creation rules, upcoming-events listing"`

---

### Task 4: Server — join / leave / cancel

**Files:**
- Modify: `server/src/routes/events.ts` (append three routes), `server/tests/events.create.test.ts` (un-skip the cancelled-visibility test)
- Create: `server/tests/events.membership.test.ts`

**Interfaces:**
- Consumes: Task 3's router, model, `requireUser`.
- Produces: `POST /api/events/:id/join`, `POST /api/events/:id/leave`, `POST /api/events/:id/cancel` — all responding `{ event: PublicEvent }`.

- [ ] **Step 1: Failing tests** — create `server/tests/events.membership.test.ts`:

```typescript
import type { Express } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { Event } from "../src/models/Event";
import { setupTestDb } from "./helpers";

setupTestDb();

async function registeredAgent(app: Express, username: string): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send({ username, password: "Secret1" });
  return agent;
}

function futureIso(hours = 2): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

async function createSocial(host: ReturnType<typeof request.agent>, capacity: number): Promise<string> {
  const res = await host.post("/api/events").send({
    title: "Evening run",
    sport: "running",
    type: "social",
    locationText: "Южен парк",
    startsAt: futureIso(),
    durationMinutes: 60,
    capacity,
  });
  return res.body.event.id as string;
}

describe("event membership", () => {
  it("joins an open event and reports the new participant list", async () => {
    const app = createApp();
    const host = await registeredAgent(app, "mira");
    const bob = await registeredAgent(app, "bob");
    const id = await createSocial(host, 3);
    const res = await bob.post(`/api/events/${id}/join`);
    expect(res.status).toBe(200);
    expect(res.body.event.participants).toEqual(["mira", "bob"]);
  });

  it("rejects a second join with ALREADY_JOINED", async () => {
    const app = createApp();
    const host = await registeredAgent(app, "mira");
    const bob = await registeredAgent(app, "bob");
    const id = await createSocial(host, 3);
    await bob.post(`/api/events/${id}/join`);
    const res = await bob.post(`/api/events/${id}/join`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ALREADY_JOINED");
  });

  it("rejects joining a full event with EVENT_FULL", async () => {
    const app = createApp();
    const host = await registeredAgent(app, "mira");
    const bob = await registeredAgent(app, "bob");
    const zed = await registeredAgent(app, "zed");
    const id = await createSocial(host, 2);
    await bob.post(`/api/events/${id}/join`);
    const res = await zed.post(`/api/events/${id}/join`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EVENT_FULL");
  });

  it("never oversells the last slot under concurrent joins", async () => {
    const app = createApp();
    const host = await registeredAgent(app, "mira");
    const id = await createSocial(host, 4); // host takes 1, leaving 3
    const joiners = await Promise.all(
      ["u1", "u2", "u3", "u4", "u5"].map((name) => registeredAgent(app, name)),
    );
    const results = await Promise.all(joiners.map((agent) => agent.post(`/api/events/${id}/join`)));
    const wins = results.filter((r) => r.status === 200).length;
    expect(wins).toBe(3);
    const doc = await Event.findById(id);
    expect(doc!.participants).toHaveLength(4);
  });

  it("rejects joining a started event with EVENT_STARTED", async () => {
    const app = createApp();
    const bob = await registeredAgent(app, "bob");
    const doc = await Event.create({
      title: "Started run", sport: "running", type: "social", description: null,
      host: "mira", hostTrainer: false, placeId: null, placeName: null, placeAddress: null,
      locationText: "парк", startsAt: new Date(Date.now() - 60 * 1000), durationMinutes: 60,
      capacity: 5, participants: ["mira"], price: null, status: "active",
    });
    const res = await bob.post(`/api/events/${doc.id as string}/join`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EVENT_STARTED");
  });

  it("returns 404 for an unknown event id", async () => {
    const app = createApp();
    const bob = await registeredAgent(app, "bob");
    const res = await bob.post("/api/events/64b000000000000000000000/join");
    expect(res.status).toBe(404);
  });

  it("lets a participant leave, but not the social host", async () => {
    const app = createApp();
    const host = await registeredAgent(app, "mira");
    const bob = await registeredAgent(app, "bob");
    const id = await createSocial(host, 3);
    await bob.post(`/api/events/${id}/join`);
    const left = await bob.post(`/api/events/${id}/leave`);
    expect(left.status).toBe(200);
    expect(left.body.event.participants).toEqual(["mira"]);
    const notJoined = await bob.post(`/api/events/${id}/leave`);
    expect(notJoined.status).toBe(409);
    expect(notJoined.body.error.code).toBe("NOT_JOINED");
    const hostLeave = await host.post(`/api/events/${id}/leave`);
    expect(hostLeave.status).toBe(409);
    expect(hostLeave.body.error.code).toBe("HOST_CANNOT_LEAVE");
  });

  it("cancel is host-only, soft, and blocks joining", async () => {
    const app = createApp();
    const host = await registeredAgent(app, "mira");
    const bob = await registeredAgent(app, "bob");
    const id = await createSocial(host, 3);
    const notHost = await bob.post(`/api/events/${id}/cancel`);
    expect(notHost.status).toBe(403);
    const cancelled = await host.post(`/api/events/${id}/cancel`);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.event.status).toBe("cancelled");
    const again = await host.post(`/api/events/${id}/cancel`);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("EVENT_CANCELLED");
    const join = await bob.post(`/api/events/${id}/join`);
    expect(join.status).toBe(409);
    expect(join.body.error.code).toBe("EVENT_CANCELLED");
  });

  it("requires authentication on all membership routes", async () => {
    const app = createApp();
    for (const path of ["join", "leave", "cancel"]) {
      const res = await request(app).post(`/api/events/64b000000000000000000000/${path}`);
      expect(res.status).toBe(401);
    }
  });
});
```

- [ ] **Step 2: Verify failure** — `npm test -w server -- tests/events.membership.test.ts` → FAIL (404s from missing routes).

- [ ] **Step 3: Implement** — append to `server/src/routes/events.ts`:

```typescript
async function loadEventOr404(id: string): Promise<EventLean> {
  const event = mongoose.isValidObjectId(id) ? await Event.findById(id).lean<EventLean>() : null;
  if (!event) {
    throw new AppError(404, "NOT_FOUND", "Event not found");
  }
  return event;
}

eventsRouter.post("/:id/join", requireAuth, async (req, res) => {
  const me = await requireUser(req.session.userId);
  const id = req.params.id;
  const now = new Date();

  const result = mongoose.isValidObjectId(id)
    ? await Event.updateOne(
        {
          _id: id,
          status: "active",
          startsAt: { $gt: now },
          participants: { $ne: me.username },
          // The capacity check lives INSIDE the update filter so two users
          // can never take the same last slot.
          $expr: { $lt: [{ $size: "$participants" }, "$capacity"] },
        },
        { $push: { participants: me.username } },
      )
    : { modifiedCount: 0 };

  if (result.modifiedCount === 0) {
    const event = await loadEventOr404(id);
    if (event.status === "cancelled") {
      throw new AppError(409, "EVENT_CANCELLED", "This event was cancelled");
    }
    if (event.startsAt <= now) {
      throw new AppError(409, "EVENT_STARTED", "This event has already started");
    }
    if (event.participants.includes(me.username)) {
      throw new AppError(409, "ALREADY_JOINED", "You already joined this event");
    }
    throw new AppError(409, "EVENT_FULL", "No spots left");
  }
  res.json({ event: toPublicEvent(await loadEventOr404(id)) });
});

eventsRouter.post("/:id/leave", requireAuth, async (req, res) => {
  const me = await requireUser(req.session.userId);
  const event = await loadEventOr404(req.params.id);
  if (event.host === me.username && event.type === "social") {
    throw new AppError(409, "HOST_CANNOT_LEAVE", "Hosts can't leave their own event — cancel it instead");
  }
  const result = await Event.updateOne({ _id: event._id }, { $pull: { participants: me.username } });
  if (result.modifiedCount === 0) {
    throw new AppError(409, "NOT_JOINED", "You haven't joined this event");
  }
  res.json({ event: toPublicEvent(await loadEventOr404(req.params.id)) });
});

eventsRouter.post("/:id/cancel", requireAuth, async (req, res) => {
  const me = await requireUser(req.session.userId);
  const event = await loadEventOr404(req.params.id);
  if (event.host !== me.username) {
    throw new AppError(403, "FORBIDDEN", "Only the host can cancel this event");
  }
  if (event.status === "cancelled") {
    throw new AppError(409, "EVENT_CANCELLED", "This event was already cancelled");
  }
  await Event.updateOne({ _id: event._id }, { $set: { status: "cancelled" } });
  res.json({ event: toPublicEvent(await loadEventOr404(req.params.id)) });
});
```

Un-skip the cancelled-visibility test in `events.create.test.ts` (remove `.skip` and the comment).

- [ ] **Step 4: Verify pass** — `npm test -w server` → expected 78 (68 + 9 new + 1 un-skipped; report actuals).

- [ ] **Step 5: Commit** — `git add server && git commit -m "feat(server): atomic event join, leave, host cancel"`

---

### Task 5: Client data layer + trainer surfaces

**Files:**
- Create: `client/src/api/events.ts`, `client/src/api/events.test.ts`, `client/src/pages/Events/formatEventDate.ts`, `client/src/pages/Events/formatEventDate.test.ts`, `client/src/pages/Events/eventCardState.ts`, `client/src/pages/Events/eventCardState.test.ts`
- Modify: `client/src/pages/Profile/Profile.tsx` + `Profile.scss` (trainer toggle/bio/chip), `client/src/components/BuddyCard/BuddyCard.tsx` + `BuddyCard.scss` (TRAINER chip), `client/src/components/NavBar/NavBar.tsx` (Events link)

**Interfaces:**
- Consumes: `PublicEvent`, `CreateEventInput`, `EventType`, `ActivityKey` from shared; `request` from `./http`.
- Produces: `searchEvents(params: { type?: EventType; sport?: ActivityKey }): Promise<PublicEvent[]>`, `createEvent(input: CreateEventInput): Promise<PublicEvent>`, `joinEvent(id)`, `leaveEvent(id)`, `cancelEvent(id)` (all Promise<PublicEvent>); `formatEventDate(iso: string): string`; `eventCardState(event: PublicEvent, me: string): "cancelled" | "host" | "joined" | "full" | "joinable"`. Task 6 consumes all.

- [ ] **Step 1: Failing tests**

`client/src/api/events.test.ts`:

```typescript
import { afterEach, describe, expect, it, vi } from "vitest";
import { searchEvents } from "./events";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("searchEvents", () => {
  it("builds the query string from defined params only", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ events: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await searchEvents({ type: "training", sport: "tennis" });
    expect(fetchMock).toHaveBeenCalledWith("/api/events?type=training&sport=tennis", expect.anything());
    await searchEvents({});
    expect(fetchMock).toHaveBeenLastCalledWith("/api/events", expect.anything());
  });
});
```

`client/src/pages/Events/formatEventDate.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { formatEventDate } from "./formatEventDate";

describe("formatEventDate", () => {
  it("formats an ISO timestamp as weekday, date and time", () => {
    const iso = new Date(2026, 6, 11, 10, 30).toISOString(); // local Sat 11 Jul 2026 10:30
    expect(formatEventDate(iso)).toBe("Sat, 11 Jul · 10:30");
  });
});
```

`client/src/pages/Events/eventCardState.test.ts`:

```typescript
import type { PublicEvent } from "@sports-match/shared";
import { describe, expect, it } from "vitest";
import { eventCardState } from "./eventCardState";

function event(overrides: Partial<PublicEvent>): PublicEvent {
  return {
    id: "e1", title: "Run", sport: "running", type: "social", description: null,
    host: "mira", hostTrainer: false, place: null, locationText: "парк",
    startsAt: new Date().toISOString(), durationMinutes: 60, capacity: 3,
    participants: ["mira"], price: null, status: "active",
    ...overrides,
  };
}

describe("eventCardState", () => {
  it("orders precedence: cancelled > host > joined > full > joinable", () => {
    expect(eventCardState(event({ status: "cancelled" }), "bob")).toBe("cancelled");
    expect(eventCardState(event({}), "mira")).toBe("host");
    expect(eventCardState(event({ participants: ["mira", "bob"] }), "bob")).toBe("joined");
    expect(eventCardState(event({ participants: ["mira", "x", "y"] }), "bob")).toBe("full");
    expect(eventCardState(event({}), "bob")).toBe("joinable");
  });
});
```

- [ ] **Step 2: Verify failure** — `npm test -w client` → FAIL (modules missing).

- [ ] **Step 3: Implement the three modules**

`client/src/api/events.ts`:

```typescript
import type { ActivityKey, CreateEventInput, EventType, PublicEvent } from "@sports-match/shared";
import { request } from "./http";

export interface SearchEventsParams {
  type?: EventType;
  sport?: ActivityKey;
}

export async function searchEvents(params: SearchEventsParams): Promise<PublicEvent[]> {
  const query = new URLSearchParams();
  if (params.type) {
    query.set("type", params.type);
  }
  if (params.sport) {
    query.set("sport", params.sport);
  }
  const qs = query.toString();
  const res = await request<{ events: PublicEvent[] }>(`/api/events${qs ? `?${qs}` : ""}`);
  return res.events;
}

export async function createEvent(input: CreateEventInput): Promise<PublicEvent> {
  const res = await request<{ event: PublicEvent }>("/api/events", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.event;
}

async function membership(id: string, action: "join" | "leave" | "cancel"): Promise<PublicEvent> {
  const res = await request<{ event: PublicEvent }>(`/api/events/${encodeURIComponent(id)}/${action}`, {
    method: "POST",
  });
  return res.event;
}

export const joinEvent = (id: string): Promise<PublicEvent> => membership(id, "join");
export const leaveEvent = (id: string): Promise<PublicEvent> => membership(id, "leave");
export const cancelEvent = (id: string): Promise<PublicEvent> => membership(id, "cancel");
```

`client/src/pages/Events/formatEventDate.ts`:

```typescript
/** "Sat, 11 Jul · 10:30" — local time, matching the chat's terse date voice. */
export function formatEventDate(iso: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${day.replace(",", "").replace(" ", ", ")} · ${time}`;
}
```

NOTE to implementer: verify the exact output of `toLocaleDateString("en-GB", …)` in the test run ("Sat 11 Jul" vs "Sat, 11 Jul" varies by ICU) and normalize deterministically so the test passes on this machine — the contract is the final format `"Sat, 11 Jul · 10:30"`.

`client/src/pages/Events/eventCardState.ts`:

```typescript
import type { PublicEvent } from "@sports-match/shared";

export type EventCardState = "cancelled" | "host" | "joined" | "full" | "joinable";

/** Precedence matters: a cancelled event is cancelled even for its host. */
export function eventCardState(event: PublicEvent, me: string): EventCardState {
  if (event.status === "cancelled") {
    return "cancelled";
  }
  if (event.host === me) {
    return "host";
  }
  if (event.participants.includes(me)) {
    return "joined";
  }
  if (event.participants.length >= event.capacity) {
    return "full";
  }
  return "joinable";
}
```

- [ ] **Step 4: Trainer surfaces** (read each file first; bind existing patterns):

1. `client/src/pages/Profile/Profile.tsx` — EDIT MODE: after the gender field add a trainer row: a labelled checkbox `I'm a trainer` bound like the other draft fields (`checked={draft.trainer ?? user?.trainer ?? false}`, onChange stores `{ trainer: e.target.checked }` via the existing handleEdit mechanism — if handleEdit is string-typed, add a dedicated small handler that does `setDraft((d) => ({ ...d, trainer: e.target.checked }))` following the file's conventions), and when the effective trainer value is true, a `Trainer bio` text input bound like city (`draft.trainerBio ?? user?.trainerBio ?? ""`, max intent 120 — server validates). VIEW MODE: when `user.trainer`, render a chip `<span className="profileCard__trainerChip">TRAINER</span>` next to the username and, if `user.trainerBio`, a muted bio line under the meta row. `Profile.scss`: `profileCard__trainerChip` uses `@include chip($amber-soft, $amber-deep);` plus `letter-spacing: .06em; font-size: 10.5px;`; bio line `color: $muted; font-size: 13px; margin-top: 4px;`.
2. `client/src/components/BuddyCard/BuddyCard.tsx` — after the name, `{user.trainer && <span className="buddyCard__trainer">TRAINER</span>}`; `BuddyCard.scss`: `.buddyCard__trainer { @include chip($amber-soft, $amber-deep); font-size: 10px; letter-spacing: .06em; margin-top: 4px; }`.
3. `client/src/components/NavBar/NavBar.tsx` — add `{ to: "/events", label: "Events" }` to `APP_LINKS` between Messages and Places.
4. Update `client/src/pages/Profile/Profile.test.tsx` mock user objects to include `trainer: false, trainerBio: ""` (PublicUser type gained required fields — the NavBar test's user mock too, and any other mocked PublicUser the type-checker flags).

- [ ] **Step 5: Verify** — `npm test -w client` → expected 31 (24 + 7 new; report actuals) and `npm run build -w client` clean.

- [ ] **Step 6: Commit** — `git add client && git commit -m "feat(client): events data layer, trainer profile toggle and badges"`

---

### Task 6: Client — Events page

**Files:**
- Create: `client/src/pages/Events/Events.tsx`, `client/src/pages/Events/Events.scss`
- Modify: `client/src/App.tsx` (route `/events` inside RequireAuth)

**Interfaces:**
- Consumes: everything Task 5 produced; `CLIENT_ACTIVITIES`, `Radar`, `CustomAlert`, `useAuth`, `useDebounce` not needed (no text search v1); `searchPlaces` from `client/src/api/places.ts` (for the venue select).

- [ ] **Step 1: Write the page** — create `client/src/pages/Events/Events.tsx`:

```tsx
import type { ActivityKey, CreateEventInput, EventType, PublicEvent } from "@sports-match/shared";
import { createEventInputSchema } from "@sports-match/shared";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CLIENT_ACTIVITIES } from "../../activities/catalogue";
import * as eventsApi from "../../api/events";
import { ApiError } from "../../api/http";
import * as placesApi from "../../api/places";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import Radar from "../../components/Orbit/Radar";
import { useAuth } from "../../context/AuthContext";
import { eventCardState } from "./eventCardState";
import { formatEventDate } from "./formatEventDate";
import "./Events.scss";

const sortedActivities = [...CLIENT_ACTIVITIES].sort((a, b) => a.label.localeCompare(b.label));
const TYPE_FILTERS: { value: "" | EventType; label: string }[] = [
  { value: "", label: "All" },
  { value: "training", label: "Training" },
  { value: "social", label: "Social" },
];

interface FormState {
  title: string;
  sport: string;
  type: EventType;
  description: string;
  placeId: string;
  locationText: string;
  startsAt: string;
  durationMinutes: string;
  capacity: string;
  price: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  sport: "",
  type: "social",
  description: "",
  placeId: "",
  locationText: "",
  startsAt: "",
  durationMinutes: "60",
  capacity: "6",
  price: "",
};

export default function EventsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [typeFilter, setTypeFilter] = useState<"" | EventType>("");
  const [sportFilter, setSportFilter] = useState("");
  const [places, setPlaces] = useState<{ id: string; name: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  // Safe: this route renders inside RequireAuth, which blocks until the auth check resolves.
  const me = user?.username ?? "";

  const refresh = useCallback(async () => {
    try {
      const results = await eventsApi.searchEvents({
        type: typeFilter || undefined,
        // Select options come from the catalogue, so the value is a valid key or "".
        sport: (sportFilter || undefined) as ActivityKey | undefined,
      });
      setEvents(results);
      setError("");
    } catch {
      setEvents([]);
      setError("Could not load events. Please try again.");
    }
  }, [typeFilter, sportFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    placesApi
      .searchPlaces({})
      .then((results) => setPlaces(results.map((place) => ({ id: place.id, name: place.name }))))
      .catch(() => setPlaces([]));
  }, []);

  const setField = (field: keyof FormState) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const candidate: CreateEventInput = {
      title: form.title,
      sport: form.sport as ActivityKey,
      type: form.type,
      description: form.description || undefined,
      placeId: form.placeId || undefined,
      locationText: form.placeId ? undefined : form.locationText || undefined,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : "",
      durationMinutes: Number(form.durationMinutes),
      capacity: Number(form.capacity),
      price: form.type === "training" && form.price ? form.price : undefined,
    };
    const parsed = createEventInputSchema.safeParse(candidate);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    try {
      await eventsApi.createEvent(parsed.data);
      setForm(EMPTY_FORM);
      setShowForm(false);
      setFormError("");
      await refresh();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not create the event.");
    }
  };

  const membership = async (id: string, action: "join" | "leave" | "cancel") => {
    setBusyId(id);
    try {
      if (action === "join") {
        await eventsApi.joinEvent(id);
      } else if (action === "leave") {
        await eventsApi.leaveEvent(id);
      } else {
        await eventsApi.cancelEvent(id);
      }
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusyId("");
      await refresh();
    }
  };

  return (
    <div className="eventsPage">
      <header className="eventsPage__head">
        <div>
          <h1 className="eventsPage__title">Events</h1>
          <p className="eventsPage__subtitle">Join a session or start your own</p>
        </div>
        <button type="button" className="eventsPage__create" onClick={() => setShowForm((open) => !open)}>
          {showForm ? "Close" : "Create event"}
        </button>
      </header>

      <div className="eventsPage__filters">
        <div className="eventsPage__segments" role="group" aria-label="Event type">
          {TYPE_FILTERS.map((option) => (
            <button
              key={option.label}
              type="button"
              className={typeFilter === option.value ? "eventsPage__segment eventsPage__segment--active" : "eventsPage__segment"}
              onClick={() => setTypeFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <select
          className="eventsPage__select"
          aria-label="Filter by sport"
          value={sportFilter}
          onChange={(e) => setSportFilter(e.target.value)}
        >
          <option value="">All sports</option>
          {sortedActivities.map((activity) => (
            <option key={activity.key} value={activity.key}>
              {activity.label}
            </option>
          ))}
        </select>
      </div>

      {showForm && (
        <form className="eventForm" onSubmit={handleCreate}>
          <div className="eventForm__grid">
            <label className="eventForm__field">
              Title
              <input className="eventForm__input" value={form.title} onChange={(e) => setField("title")(e.target.value)} required />
            </label>
            <label className="eventForm__field">
              Sport
              <select className="eventForm__input" value={form.sport} onChange={(e) => setField("sport")(e.target.value)} required>
                <option value="">Choose a sport</option>
                {sortedActivities.map((activity) => (
                  <option key={activity.key} value={activity.key}>
                    {activity.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="eventForm__field">
              Type
              <select className="eventForm__input" value={form.type} onChange={(e) => setField("type")(e.target.value)}>
                <option value="social">Social</option>
                {user?.trainer && <option value="training">Training</option>}
              </select>
            </label>
            <label className="eventForm__field">
              Venue
              <select className="eventForm__input" value={form.placeId} onChange={(e) => setField("placeId")(e.target.value)}>
                <option value="">Custom location…</option>
                {places.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.name}
                  </option>
                ))}
              </select>
            </label>
            {!form.placeId && (
              <label className="eventForm__field">
                Location
                <input
                  className="eventForm__input"
                  placeholder="e.g. Южен парк, входа"
                  value={form.locationText}
                  onChange={(e) => setField("locationText")(e.target.value)}
                />
              </label>
            )}
            <label className="eventForm__field">
              Starts at
              <input
                className="eventForm__input"
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setField("startsAt")(e.target.value)}
                required
              />
            </label>
            <label className="eventForm__field">
              Duration (min)
              <input
                className="eventForm__input"
                type="number"
                min={15}
                max={480}
                value={form.durationMinutes}
                onChange={(e) => setField("durationMinutes")(e.target.value)}
              />
            </label>
            <label className="eventForm__field">
              Spots
              <input
                className="eventForm__input"
                type="number"
                min={2}
                max={100}
                value={form.capacity}
                onChange={(e) => setField("capacity")(e.target.value)}
              />
            </label>
            {form.type === "training" && (
              <label className="eventForm__field">
                Price (optional)
                <input
                  className="eventForm__input"
                  placeholder="e.g. 15 lv / session"
                  value={form.price}
                  onChange={(e) => setField("price")(e.target.value)}
                />
              </label>
            )}
            <label className="eventForm__field eventForm__field--wide">
              Description (optional)
              <textarea
                className="eventForm__input eventForm__textarea"
                value={form.description}
                onChange={(e) => setField("description")(e.target.value)}
              />
            </label>
          </div>
          {formError && <CustomAlert variant="danger" message={formError} />}
          <button type="submit" className="eventForm__submit">
            Publish event
          </button>
        </form>
      )}

      {error && <CustomAlert variant="danger" message={error} />}

      {events.length > 0 ? (
        <div className="eventsPage__grid">
          {events.map((event) => {
            const state = eventCardState(event, me);
            return (
              <article key={event.id} className={state === "cancelled" ? "eventCard eventCard--cancelled" : "eventCard"}>
                <div className="eventCard__top">
                  <span className="eventCard__when">{formatEventDate(event.startsAt)}</span>
                  {event.type === "training" && <span className="eventCard__badge">TRAINER</span>}
                </div>
                <h3 className="eventCard__title">{event.title}</h3>
                <div className="eventCard__chips">
                  <span className="eventCard__chip">{sortedActivities.find((a) => a.key === event.sport)?.label ?? event.sport}</span>
                  {event.price && <span className="eventCard__chip eventCard__chip--price">{event.price}</span>}
                </div>
                <p className="eventCard__where">{event.place ? `${event.place.name} · ${event.place.address}` : event.locationText}</p>
                {event.description && <p className="eventCard__desc">{event.description}</p>}
                <div className="eventCard__meta">
                  <span className="eventCard__host">
                    by {event.host}
                    {event.host !== me && (
                      <button
                        type="button"
                        className="eventCard__msg"
                        onClick={() => navigate("/messages", { state: { receiver: event.host } })}
                      >
                        Message
                      </button>
                    )}
                  </span>
                  <span className="eventCard__slots">
                    {event.participants.length}/{event.capacity} spots
                  </span>
                </div>
                <div className="eventCard__actions">
                  {state === "cancelled" && <span className="eventCard__cancelledLabel">CANCELLED</span>}
                  {state === "host" && (
                    <>
                      <span className="eventCard__hosting">Hosting</span>
                      <button type="button" className="eventCard__cancel" disabled={busyId === event.id} onClick={() => void membership(event.id, "cancel")}>
                        Cancel event
                      </button>
                    </>
                  )}
                  {state === "joined" && (
                    <button type="button" className="eventCard__leave" disabled={busyId === event.id} onClick={() => void membership(event.id, "leave")}>
                      Leave
                    </button>
                  )}
                  {state === "full" && (
                    <button type="button" className="eventCard__join" disabled>
                      Full
                    </button>
                  )}
                  {state === "joinable" && (
                    <button type="button" className="eventCard__join" disabled={busyId === event.id} onClick={() => void membership(event.id, "join")}>
                      Join
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        !error && (
          <div className="eventsPage__empty">
            <Radar size={110} />
            <p>No upcoming events — create the first one</p>
          </div>
        )
      )}
    </div>
  );
}
```

- [ ] **Step 2: Styles** — create `client/src/pages/Events/Events.scss`:

```scss
@import "../../styles/tokens";
@import "../../styles/mixins";

.eventsPage {
    @include page-container;

    &__head {
        display: flex;
        align-items: center;
        gap: 16px;
        justify-content: space-between;
        flex-wrap: wrap;
    }

    &__title {
        font-size: 28px;
    }

    &__subtitle {
        color: $muted;
        font-size: 14px;
        margin-top: 6px;
    }

    &__create {
        @include button-primary;
    }

    &__filters {
        display: flex;
        gap: 12px;
        align-items: center;
        margin: 20px 0 22px;
        flex-wrap: wrap;
    }

    &__segments {
        display: flex;
        background: $surface;
        border: 1.5px solid $border;
        border-radius: $radius-pill;
        padding: 3px;
        gap: 2px;
    }

    &__segment {
        border: none;
        background: none;
        font-family: $font;
        font-weight: 700;
        font-size: 13px;
        color: $muted;
        padding: 7px 16px;
        border-radius: $radius-pill;
        cursor: pointer;
        @include focus-ring;

        &--active {
            background: $accent-soft;
            color: $accent-deep;
        }
    }

    &__select {
        @include input-pill;
    }

    &__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 16px;
    }

    &__empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 18px;
        padding: 48px 0;
        color: $muted;
        font-weight: 700;
    }
}

.eventForm {
    @include card;
    padding: 22px;
    margin-bottom: 24px;

    &__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 14px;
    }

    &__field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-weight: 700;
        font-size: 13px;

        &--wide {
            grid-column: 1 / -1;
        }
    }

    &__input {
        @include input-pill;
        font-weight: 400;
    }

    &__textarea {
        border-radius: $radius-card;
        min-height: 70px;
        resize: vertical;
    }

    &__submit {
        @include button-primary;
        margin-top: 16px;
    }
}

.eventCard {
    @include card;
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 8px;

    &--cancelled {
        opacity: 0.65;
    }

    &__top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
    }

    &__when {
        font-weight: 800;
        font-size: 13px;
        color: $accent-deep;
    }

    &__badge {
        @include chip($amber-soft, $amber-deep);
        font-size: 10px;
        letter-spacing: 0.06em;
    }

    &__title {
        font-size: 17px;
    }

    &__chips {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
    }

    &__chip {
        @include chip($accent-soft, $accent-deep);

        &--price {
            background: $amber-soft;
            color: $amber-deep;
        }
    }

    &__where {
        color: $ink-soft;
        font-size: 13px;
    }

    &__desc {
        color: $muted;
        font-size: 13px;
    }

    &__meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        margin-top: 2px;
        font-size: 12.5px;
        color: $muted;
        font-weight: 700;
    }

    &__msg {
        background: none;
        border: none;
        color: $accent-strong;
        font-family: $font;
        font-weight: 700;
        font-size: 12.5px;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: $radius-pill;
        @include focus-ring;
    }

    &__actions {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 6px;
    }

    &__join {
        @include button-primary;
        padding: 9px 20px;
        font-size: 13.5px;
    }

    &__leave,
    &__cancel {
        @include button-ghost;
        padding: 9px 20px;
        font-size: 13.5px;
    }

    &__cancel:hover:not(:disabled) {
        border-color: $danger;
        color: $danger;
    }

    &__hosting {
        @include chip($accent-soft, $accent-deep);
    }

    &__cancelledLabel {
        @include chip($danger-soft, $danger);
        letter-spacing: 0.06em;
    }
}
```

- [ ] **Step 3: Route** — in `client/src/App.tsx`, import `EventsPage from "./pages/Events/Events"` and add `<Route path="/events" element={<EventsPage />} />` inside the RequireAuth group (after `/messages`).

- [ ] **Step 4: Verify** — `npm test -w client` (31 expected) + `npm run build -w client` clean + full `npm test` from root (expected ~150 total: 41 shared / 78 server / 31 client; report actuals). dev:memory boot smoke: background boot, health curl, kill processes, verify ports free.

- [ ] **Step 5: Commit** — `git add client && git commit -m "feat(client): Events page — filters, create form, join/leave/cancel cards"`
