# Phase 5 — Events (Trainers + Social) — Design

**Date:** 2026-07-05
**Status:** Approved by Andrei (product decisions chosen individually; Sections
1–2 approved; full-autonomy grant for the remainder: "Do not ask me for
confirmation, build the whole project as you see fit")
**Parent spec:** `2026-07-04-fullstack-rebuild-design.md`. **Baseline:**
Orbit redesign + profile rework complete at commit `c81d42e` (109 tests:
29 shared / 56 server / 24 client).

## Goal

Trainers create training events with open slots people can take; anyone
creates social sport events others can join. One Events discovery page.
Completes Andrei's "trainer section + social events" ask.

## Decisions made

| Decision | Choice | Why |
|---|---|---|
| Trainer role | Self-declared profile toggle + visible TRAINER badge; optional short bio (max 120) | Zero admin tooling; verification can layer on later. Chosen over admin-verified and no-role |
| Pricing | Display-only price string on training events (e.g. "15 lv / session"); no payments | Realistic for local trainers; Stripe etc. out of scope. Chosen over no-pricing |
| Discovery | ONE Events page with filter pills (All / Training / Social + sport) | Young community — splitting surfaces makes both look empty. Chosen over separate Trainers page |
| Training events | Only trainer accounts can create `type: "training"` (server-enforced 403); price allowed only on training | The badge means something |
| Slot semantics | Social: host auto-joins (takes a slot). Training: host runs it, all slots are attendees' | Matches reality |
| Venue | `placeId` from the places catalogue OR free-text location (≥1 required); catalogue picks are verified and snapshotted `{placeId, name, address}` onto the event | Reuses Phase 4; no join at list time; events survive catalogue edits |
| Join concurrency | Single atomic update: active + not started + not joined + `$size(participants) < capacity` all in the update filter | Two users can't take the last slot; typed 409s (EVENT_FULL / ALREADY_JOINED / EVENT_STARTED) via one follow-up read |
| Cancellation | Host-only soft cancel (`status: "cancelled"`); cancelled events remain visible ONLY to their participants/host, marked CANCELLED | v1 has no notifications — this is how joiners learn |
| Editing | None in v1 — cancel + recreate | YAGNI; avoids a second validation surface |
| Leaving | Any participant can leave before start; social host cannot leave own event (must cancel) | Coherent slot accounting |

## Section 1 — Shared contract

- `updateProfileInputSchema` gains `trainer: z.boolean().optional()` and
  `trainerBio: z.string().trim().max(120).optional()`; `publicUserSchema`
  gains both (`trainer` default false).
- New `shared/src/events.ts` (re-exported from index):
  - `eventTypeSchema = z.enum(["training", "social"])`.
  - `createEventInputSchema`: `title` (trim 3–80), `sport`
    (activityKeySchema), `type`, `description` (trim max 500, optional),
    `placeId` (string, optional), `locationText` (trim 3–120, optional),
    `startsAt` (ISO datetime string; refine: parses to a future date),
    `durationMinutes` (int 15–480), `capacity` (int 2–100), `price`
    (trim max 40, optional). Refinements: at least one of
    `placeId`/`locationText`; `price` only when `type === "training"`.
  - `publicEventSchema` / `PublicEvent`: `{ id, title, sport, type,
    description: string | null, host, hostTrainer: boolean, place:
    { id, name, address } | null, locationText: string | null, startsAt
    (ISO), durationMinutes, capacity, participants: string[], price:
    string | null, status: "active" | "cancelled" }`.
  - `searchEventsQuerySchema`: `{ type?: eventTypeSchema, sport?:
    activityKeySchema }`.
  - `EVENTS_RESULT_CAP = 100` lives server-side like other caps.

## Section 2 — Server

- `User` model gains `trainer` (Boolean, default false) and `trainerBio`
  (String, default ""); `toPublicUser` exposes them. PATCH /me accepts
  them via the extended schema (mass-assignment tests keep protecting
  username/passwordHash).
- **Event model** (`server/src/models/Event.ts`): contract fields +
  `host` (username), `participants: [String]`, `status`
  (enum active/cancelled, default active), venue snapshot fields
  (`placeId`, `placeName`, `placeAddress` — all nullable — plus
  `locationText` nullable), index `{ startsAt: 1 }`,
  `toPublicEvent(event): PublicEvent`.
- **Routes** (`/api/events`, requireAuth, standard envelope):
  - `POST /` — validate(createEventInputSchema); `type === "training"`
    requires the requester's `trainer` flag (403 FORBIDDEN otherwise);
    `placeId` (when given) must exist in Place (400 VALIDATION_ERROR
    otherwise) and is snapshotted; social events push the host into
    `participants` at creation. Responds `{ event }` 201.
  - `GET /` — validateQuery(searchEventsQuerySchema); returns upcoming
    (`startsAt > now`) events sorted ascending, cap 100:
    active ones for everyone + cancelled ones only where requester is
    host or participant. `{ events: PublicEvent[] }`.
  - `POST /:id/join` — atomic
    `updateOne({ _id, status: "active", startsAt: { $gt: now },
    participants: { $ne: me }, $expr: { $lt: [{ $size: "$participants" },
    "$capacity"] } }, { $push: { participants: me } })`; when
    `modifiedCount === 0`, one read distinguishes 404 NOT_FOUND /
    409 EVENT_CANCELLED / 409 EVENT_STARTED / 409 ALREADY_JOINED /
    409 EVENT_FULL. Success responds `{ event }` (fresh read).
  - `POST /:id/leave` — social hosts get 409 HOST_CANNOT_LEAVE;
    otherwise `$pull` me (409 NOT_JOINED if absent). `{ event }`.
  - `POST /:id/cancel` — host only (403), idempotent-safe (409
    EVENT_CANCELLED if already), sets status. `{ event }`.

## Section 3 — Client

- **Profile**: edit mode gains "I'm a trainer" toggle (checkbox styled
  as a pill switch) + trainer bio input (shown when trainer); view mode
  shows a TRAINER chip + bio line. Saved through the existing draft/
  updateProfile flow.
- **BuddyCard**: small TRAINER chip when `user.trainer`.
- **NavBar**: "Events" link added to APP_LINKS (before Places).
- **Events page** (`/events`, RequireAuth, Orbit-styled):
  - Header + filter row: segmented pills All / Training / Social,
    sport select ("All sports" + catalogue), "Create event" primary
    button toggling an inline create-form card (no routing).
  - Create form: title, sport select, type select (social for everyone;
    training option only rendered for trainers), venue = place select
    ("Custom location…" option reveals the text input) — place options
    fetched once via the existing places API, description, datetime-local
    input for startsAt, duration + capacity number inputs, price input
    (training only). Client-side zod validation with inline errors
    (register-form pattern); submit → create → refetch list.
  - Event cards grid: date/time block (new `formatEventDate` util,
    tested), title, sport chip, TRAINER badge + price chip on training
    events, host chip ("Message" → existing `/messages` navigation with
    `state.receiver`, hidden on own events), venue line (place name +
    address, or locationText), slots line "taken/capacity spots" +
    Join (primary; disabled/relabelled when full: "Full"), Leave
    (ghost) when joined, Cancel (ghost danger) for the host, CANCELLED
    ribbon state for cancelled events. Own-hosted events show "Hosting".
  - Empty state: scanning Radar + "No upcoming events — create the
    first one".
  - API wrapper `client/src/api/events.ts`: searchEvents(params),
    createEvent(input), joinEvent(id), leaveEvent(id), cancelEvent(id).
- Typed 409s surface via CustomAlert using the server's message.

## Section 4 — Testing & success criteria

- **Shared**: create-schema rules (title/dates/capacity bounds, venue
  at-least-one, price-only-training, future startsAt), query schema,
  trainer/trainerBio on the profile schema.
- **Server**: trainer flag PATCH round-trip; create training as trainer
  (201) / as non-trainer (403); create social auto-joins host; bad
  placeId 400; snapshot correctness; GET filters (type, sport) +
  ascending order + past events excluded + cancelled visibility rule;
  join success updates participants; join races: `Promise.all` of N >
  capacity concurrent joins yields exactly `capacity` participants;
  ALREADY_JOINED; EVENT_FULL; EVENT_STARTED (fixture in the past —
  insert directly); leave + NOT_JOINED + HOST_CANNOT_LEAVE; cancel
  host-only + already-cancelled; 401s.
- **Client**: events API query construction; `formatEventDate` unit
  tests; slot/button-state helper unit test (join/leave/full/host
  states).
- **Success criterion** (dev:memory): user A toggles trainer, creates a
  training event with price at a catalogue venue; user B filters
  Training, joins (slots tick up), messages the host; user C joins until
  full → Join shows Full; A cancels → B still sees it marked CANCELLED;
  B creates a social event and A joins it.

## Out of scope (deliberate)

- Payments, notifications/reminders, waitlists, recurring events,
  event editing, per-event group chat, trainer verification/ratings,
  calendars/exports, event images, past-event history page.
