# Phase 4 — Places Catalogue + Near Me Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the prototype's Sofia venue catalogue from MongoDB with sport/text filters and a "Near me" distance sort, rendered by the ported Places page — retiring the last ComingSoon route.

**Architecture:** A read-only curated catalogue: a `Place` model with a 2dsphere geo index, seeded idempotently at boot from a typed 54-venue data file; one `GET /api/places` endpoint that switches between a name-sorted `find()` and a distance-sorted `$geoNear` aggregation; a client page ported byte-identical from the prototype plus one new "Near me" button using browser geolocation.

**Tech Stack:** TypeScript strict everywhere, Zod v4 (shared contract), Express 5 + Mongoose 8 ($geoNear, 2dsphere), Vite + React 18, Vitest + supertest + mongodb-memory-server.

**Spec:** `docs/superpowers/specs/2026-07-05-phase4-places-design.md` (baseline: Phase 3 complete at `7f2475c`, 71 tests: 20 shared / 39 server / 12 client).

## Global Constraints

- TypeScript `strict: true`; **zero `any`** — where a cast is unavoidable, use a commented `as` cast explaining why it is safe.
- API errors always use the envelope `{ error: { code, message } }`; validation failures are 400 `VALIDATION_ERROR`; anonymous access is 401 `UNAUTHORIZED`.
- Result cap is exactly **100**, named `PLACES_RESULT_CAP`, with the comment `// Documented cap (see phase 4 spec): no pagination at catalogue scale.`
- `distanceKm` appears **only** on near-me responses, rounded to 0.1 km (`Math.round(meters / 100) / 10`).
- GeoJSON `[lng, lat]` ordering lives **only** inside `server/src/models/Place.ts`, `server/src/seed/*`, and the `$geoNear` stage; the wire format is flat `lat` / `lng` numbers.
- The seed is idempotent: `countDocuments({}) === 0` guard; exactly **54** venues; `seedPlaces()` also runs `Place.createIndexes()` unconditionally (dropDatabase in tests and fresh dev:memory boots both need the 2dsphere index re-created before `$geoNear` works).
- Client page copy verbatim: slogan `Choose your favorite sport and get suggestions where to play in Sofia`; placeholder `Type to search`; default option `Choose sport category`; empty state `No results`; the `or / and` text between the inputs.
- classNames verbatim from the prototype: `placesPage`, `siteSloganTitle`, `searchWrapper`, `inputSearch`, `selectSearch`, `sportsPageContainer`, `sportPlaceCard`, `inner`.
- `Places.scss` and `PlacesCard.scss` are ported **byte-identical** via `git show prototype:...`; the only allowed change is the documented `.nearMeButton` block appended to `Places.scss` in Task 4.
- Workspace test commands: `npm test -w shared`, `npm test -w server`, `npm test -w client` (run from the repo root).

## File Structure

| File | Responsibility |
|---|---|
| `shared/src/places.ts` (new) | Wire contract: `publicPlaceSchema`/`PublicPlace`, `searchPlacesQuerySchema`/`SearchPlacesQuery` |
| `server/src/models/Place.ts` (new) | Mongoose model, 2dsphere index, `toPublicPlace()` GeoJSON→lat/lng flattening |
| `server/src/seed/placesData.ts` (new) | The 54 curated venues as data (`PLACES_SEED`) |
| `server/src/seed/places.ts` (new) | `seedPlaces()`: createIndexes + count-guarded insert |
| `server/src/util/escapeRegExp.ts` (new) | Shared regex-escape helper (moved out of `routes/users.ts`) |
| `server/src/routes/places.ts` (new) | `GET /api/places` — find path + `$geoNear` path |
| `client/src/api/places.ts` (new) | `searchPlaces()` fetch wrapper |
| `client/src/components/PlacesCard/PlacesCard.tsx` + `.scss` (new) | Typed venue card with image fallback + distance line |
| `client/src/pages/Places/Places.tsx` + `.scss` + `sportOptions.ts` (new) | The page: filters, Near me, venue-derived dropdown |
| `server/src/index.ts`, `server/src/app.ts`, `server/src/routes/users.ts`, `client/src/App.tsx`, `README.md` (modified); `client/src/pages/ComingSoon/ComingSoon.tsx` (deleted) | Wiring, route swap, roadmap |

---

### Task 1: Shared places contract

**Files:**
- Create: `shared/src/places.ts`
- Create: `shared/src/places.test.ts`
- Modify: `shared/src/index.ts`

**Interfaces:**
- Consumes: `activityKeySchema` from `shared/src/activities.ts` (exists since Phase 2).
- Produces: `publicPlaceSchema`, `PublicPlace` (fields: `id`, `name`, `sports: ActivityKey[]`, `address`, `city`, `neighborhood`, `phone`, `workingHours`, `site: string | null`, `image: string | null`, `lat: number`, `lng: number`, `distanceKm?: number`), `searchPlacesQuerySchema`, `SearchPlacesQuery` — used by Tasks 2–5 via `@sports-match/shared`.

- [ ] **Step 1: Write the failing tests**

Create `shared/src/places.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { publicPlaceSchema, searchPlacesQuerySchema } from "./places";

describe("searchPlacesQuerySchema", () => {
  it("accepts an empty query", () => {
    expect(searchPlacesQuerySchema.safeParse({}).success).toBe(true);
  });

  it("coerces lat/lng query strings to numbers", () => {
    const result = searchPlacesQuerySchema.safeParse({ lat: "42.6852", lng: "23.319" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lat).toBeCloseTo(42.6852);
      expect(result.data.lng).toBeCloseTo(23.319);
    }
  });

  it("rejects lat without lng and lng without lat", () => {
    expect(searchPlacesQuerySchema.safeParse({ lat: "42.7" }).success).toBe(false);
    expect(searchPlacesQuerySchema.safeParse({ lng: "23.3" }).success).toBe(false);
  });

  it("rejects out-of-range coordinates", () => {
    expect(searchPlacesQuerySchema.safeParse({ lat: "91", lng: "23.3" }).success).toBe(false);
    expect(searchPlacesQuerySchema.safeParse({ lat: "42.7", lng: "181" }).success).toBe(false);
  });

  it("rejects an unknown sport key", () => {
    expect(searchPlacesQuerySchema.safeParse({ sport: "quidditch" }).success).toBe(false);
  });

  it("trims q and rejects over-long q", () => {
    const trimmed = searchPlacesQuerySchema.safeParse({ q: "  зала  " });
    expect(trimmed.success).toBe(true);
    if (trimmed.success) {
      expect(trimmed.data.q).toBe("зала");
    }
    expect(searchPlacesQuerySchema.safeParse({ q: "x".repeat(101) }).success).toBe(false);
  });
});

describe("publicPlaceSchema", () => {
  it("accepts a venue with and without distanceKm", () => {
    const venue = {
      id: "abc",
      name: "Зала",
      sports: ["tennis"],
      address: "ул. Тестова 1",
      city: "София",
      neighborhood: "Център",
      phone: "0888 000 000",
      workingHours: "Понеделник - неделя: 06:00 - 23:00",
      site: null,
      image: null,
      lat: 42.7,
      lng: 23.3,
    };
    expect(publicPlaceSchema.safeParse(venue).success).toBe(true);
    expect(publicPlaceSchema.safeParse({ ...venue, distanceKm: 1.2 }).success).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -w shared`
Expected: FAIL — cannot resolve `./places`.

- [ ] **Step 3: Write the implementation**

Create `shared/src/places.ts`:

```typescript
import { z } from "zod";
import { activityKeySchema } from "./activities";

export const publicPlaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  sports: z.array(activityKeySchema),
  address: z.string(),
  city: z.string(),
  neighborhood: z.string(),
  phone: z.string(),
  workingHours: z.string(),
  site: z.string().nullable(),
  image: z.string().nullable(),
  lat: z.number(),
  lng: z.number(),
  // Present only on "near me" responses.
  distanceKm: z.number().optional(),
});
export type PublicPlace = z.infer<typeof publicPlaceSchema>;

export const searchPlacesQuerySchema = z
  .object({
    sport: activityKeySchema.optional(),
    q: z.string().trim().max(100, "Search text is too long").optional(),
    // Query-string values arrive as strings; coerce before range-checking.
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
  })
  .refine((query) => (query.lat === undefined) === (query.lng === undefined), {
    message: "lat and lng must be provided together",
  });
export type SearchPlacesQuery = z.infer<typeof searchPlacesQuerySchema>;
```

Modify `shared/src/index.ts` to re-export the new module (full file):

```typescript
export * from "./schemas";
export * from "./activities";
export * from "./chat";
export * from "./places";
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -w shared`
Expected: PASS — 27 tests (20 existing + 7 new).

- [ ] **Step 5: Commit**

```bash
git add shared/src/places.ts shared/src/places.test.ts shared/src/index.ts
git commit -m "feat(shared): places contract — PublicPlace and search query schemas"
```

---

### Task 2: Place model, curated seed, boot wiring

**Files:**
- Create: `server/src/models/Place.ts`
- Create: `server/src/seed/placesData.ts`
- Create: `server/src/seed/places.ts`
- Create: `server/tests/places.seed.test.ts`
- Modify: `server/src/index.ts`

**Interfaces:**
- Consumes: `PublicPlace` and `ACTIVITY_KEYS`/`ActivityKey` from `@sports-match/shared` (Task 1 / Phase 2).
- Produces: `Place` (Mongoose model), `PlaceFields`, `PlaceLean = PlaceFields & { _id: mongoose.Types.ObjectId }`, `toPublicPlace(place: PlaceLean, distanceMeters?: number): PublicPlace`, `seedPlaces(): Promise<void>`, `PLACES_SEED` (54 entries). Task 3's route imports `Place`, `toPublicPlace`, `PlaceFields`, `PlaceLean`.

- [ ] **Step 1: Write the failing tests**

Create `server/tests/places.seed.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { Place } from "../src/models/Place";
import { seedPlaces } from "../src/seed/places";
import { setupTestDb } from "./helpers";

setupTestDb();

describe("seedPlaces", () => {
  it("seeds the 54 curated venues into an empty database", async () => {
    await seedPlaces();
    expect(await Place.countDocuments({})).toBe(54);
    const fireball = await Place.findOne({ name: "Fireball sports hall" });
    expect(fireball?.sports).toEqual(["badminton"]);
    // The prototype's "billiards" venues carry both cue-sport catalogue keys.
    const billiards = await Place.findOne({ name: "Билярд клуб Дружба" });
    expect(billiards?.sports).toEqual(["snooker", "pool"]);
  });

  it("does not duplicate venues when run twice", async () => {
    await seedPlaces();
    await seedPlaces();
    expect(await Place.countDocuments({})).toBe(54);
  });

  it("stores coordinates as GeoJSON [lng, lat]", async () => {
    await seedPlaces();
    const fireball = await Place.findOne({ name: "Fireball sports hall" });
    expect(fireball?.location.type).toBe("Point");
    expect(fireball?.location.coordinates[0]).toBeCloseTo(23.393, 2);
    expect(fireball?.location.coordinates[1]).toBeCloseTo(42.6515, 2);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -w server -- tests/places.seed.test.ts`
Expected: FAIL — cannot resolve `../src/models/Place`.

- [ ] **Step 3: Write the Place model**

Create `server/src/models/Place.ts`:

```typescript
import type { ActivityKey, PublicPlace } from "@sports-match/shared";
import { ACTIVITY_KEYS } from "@sports-match/shared";
import mongoose from "mongoose";

export interface PlaceFields {
  name: string;
  sports: ActivityKey[];
  address: string;
  city: string;
  neighborhood: string;
  phone: string;
  workingHours: string;
  site: string | null;
  image: string | null;
  // GeoJSON: coordinates are [lng, lat] — this ordering never leaves the
  // server; the wire format is flat lat/lng (see toPublicPlace).
  location: { type: "Point"; coordinates: [number, number] };
}

const placeSchema = new mongoose.Schema<PlaceFields>({
  name: { type: String, required: true },
  sports: { type: [String], enum: [...ACTIVITY_KEYS], required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  neighborhood: { type: String, required: true },
  phone: { type: String, required: true },
  workingHours: { type: String, required: true },
  site: { type: String, default: null },
  image: { type: String, default: null },
  location: {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: { type: [Number], required: true },
  },
});
placeSchema.index({ location: "2dsphere" });

export const Place = mongoose.model<PlaceFields>("Place", placeSchema);
export type PlaceLean = PlaceFields & { _id: mongoose.Types.ObjectId };

export function toPublicPlace(place: PlaceLean, distanceMeters?: number): PublicPlace {
  const [lng, lat] = place.location.coordinates;
  return {
    id: place._id.toString(),
    name: place.name,
    sports: place.sports,
    address: place.address,
    city: place.city,
    neighborhood: place.neighborhood,
    phone: place.phone,
    workingHours: place.workingHours,
    site: place.site,
    image: place.image,
    lat,
    lng,
    ...(distanceMeters !== undefined ? { distanceKm: Math.round(distanceMeters / 100) / 10 } : {}),
  };
}
```

- [ ] **Step 4: Write the seed data file**

Create `server/src/seed/placesData.ts`. This is the prototype's 54 venues **curated** (see the phase 4 spec's decisions table): duplicate names made distinct, placeholder addresses/phones replaced with plausible fictional Sofia ones, `www.example.com` sites become `null`, image URLs kept from the prototype (Task 4's card falls back when they die), coordinates are approximate neighborhood-level points, and ski/snowboard venues carry real resort locations. Transcribe **exactly**:

```typescript
import type { ActivityKey } from "@sports-match/shared";

export interface SeedPlace {
  name: string;
  sports: ActivityKey[];
  address: string;
  city: string;
  neighborhood: string;
  phone: string;
  workingHours: string;
  site: string | null;
  image: string | null;
  lat: number;
  lng: number;
}

const WEEKDAYS = "Понеделник - петък: 07:00 - 23:00";
const DAILY = "Понеделник - неделя: 06:00 - 23:00";
const RESORT = "Всеки ден: 08:30 - 16:30";

export const PLACES_SEED: readonly SeedPlace[] = [
  // --- badminton ---
  {
    name: "Бадминтон зала Люлин",
    sports: ["badminton"],
    address: "ж.к. Люлин, ул. Арх. Георги Ненов 29",
    city: "София",
    neighborhood: "Люлин",
    phone: "0888 144 255",
    workingHours: WEEKDAYS,
    site: "www.badminton.com",
    image:
      "https://sportal365images.com/process/smp-images-production/sportal.bg/13112021/ead2e012-b2b8-4752-91d7-993c18988dcc.jpg?operations=crop(0:352:5986:3719),fit(768:433)&format=webp",
    lat: 42.7139,
    lng: 23.25,
  },
  {
    name: "Бадминтон зала Европа",
    sports: ["badminton"],
    address: "кв. Дружба, бул. Искърско шосе 7",
    city: "София",
    neighborhood: "Дружба",
    phone: "0899 635 940",
    workingHours: WEEKDAYS,
    site: "www.badminton.sportcentereurope.bg",
    image: "https://www.tce.bg/js/backend/tiny_mce/plugins/ajaxfilemanager/upload/image1_1.JPG",
    lat: 42.662,
    lng: 23.387,
  },
  {
    name: "Fireball sports hall",
    sports: ["badminton"],
    address: "кв. Дружба, бул. Цариградско шосе 133",
    city: "София",
    neighborhood: "Дружба",
    phone: "0878 811 222",
    workingHours: DAILY,
    site: "www.fireball.bg",
    image: "https://thumbs.dreamstime.com/b/empty-badminton-court-competing-32605065.jpg",
    lat: 42.6515,
    lng: 23.393,
  },
  // --- basketball ---
  {
    name: "Зала Триадица",
    sports: ["basketball"],
    address: "кв. Дружба, ул. Кръстьо Пастухов 23",
    city: "София",
    neighborhood: "Дружба",
    phone: "0884 951 868",
    workingHours: DAILY,
    site: null,
    image: "https://lh3.googleusercontent.com/p/AF1QipMOUpYWvPNLynsaDfhafrSmd-INeU52GQ5QsPt9=s1360-w1360-h1020",
    lat: 42.657,
    lng: 23.401,
  },
  {
    name: "Зала ЦСКА",
    sports: ["basketball"],
    address: "кв. Витоша 77",
    city: "София",
    neighborhood: "Витоша",
    phone: "0899 971 178",
    workingHours: DAILY,
    site: "www.cska-basket.bg",
    image:
      "https://media.gettyimages.com/id/183256716/photo/ball-and-basketball-court.jpg?s=612x612&w=gi&k=20&c=j4n2xknaJ-tL-tGZyvUxXpjhBFEteP0nx9L7ZMk0oZI=",
    lat: 42.648,
    lng: 23.299,
  },
  {
    name: "Спортна София",
    sports: ["basketball"],
    address: "ул. Българска морава 2",
    city: "София",
    neighborhood: "Зона Б-19",
    phone: "(+359 2) 8 22 11 53",
    workingHours: DAILY,
    site: "https://sportnasofia2000.com/",
    image: "https://www.isofia.bg/thumb/asp/900/1/1/2015/08/03/1438612629.jpg",
    lat: 42.702,
    lng: 23.303,
  },
  // --- billiards: the catalogue splits cue sports, so these carry both keys ---
  {
    name: "Билярд клуб Дружба",
    sports: ["snooker", "pool"],
    address: "кв. Дружба, ул. Илия Бешков 2",
    city: "София",
    neighborhood: "Дружба",
    phone: "0888 210 482",
    workingHours: DAILY,
    site: null,
    image: "https://media.timeout.com/images/103453563/750/562/image.jpg",
    lat: 42.6595,
    lng: 23.3965,
  },
  {
    name: "Билярд зала Мания",
    sports: ["snooker", "pool"],
    address: "бул. Витоша 90",
    city: "София",
    neighborhood: "Център",
    phone: "0887 331 205",
    workingHours: DAILY,
    site: null,
    image:
      "https://www.deals.bg/resources/images_opt/56250/karta-za-10-chasa-igra-na-bilyard-ot-igralna-zala-mania2_gr2.jpg",
    lat: 42.683,
    lng: 23.318,
  },
  {
    name: "Билярд клуб Централ",
    sports: ["snooker", "pool"],
    address: "ул. Георги С. Раковски 108",
    city: "София",
    neighborhood: "Център",
    phone: "0885 442 190",
    workingHours: DAILY,
    site: null,
    image:
      "https://hotelmarkovo.bg/wp-content/uploads/2020/07/%D0%91%D0%B8%D0%BB%D1%8F%D1%80%D0%B4%D0%BD%D0%B0-%D0%BC%D0%B0%D1%81%D0%B0.jpg",
    lat: 42.692,
    lng: 23.326,
  },
  // --- bowling ---
  {
    name: "Мега Екстрийм Боулинг",
    sports: ["bowling"],
    address: "бул. Цариградско шосе 92",
    city: "София",
    neighborhood: "Младост",
    phone: "0888 188 182",
    workingHours: DAILY,
    site: null,
    image: "https://mega-xtreme.com/wp-content/uploads/2020/07/sky-city-archive-new-1.jpg",
    lat: 42.656,
    lng: 23.379,
  },
  {
    name: "Боулинг Люлин",
    sports: ["bowling"],
    address: "ж.к. Люлин, бул. Джавахарлал Неру 28",
    city: "София",
    neighborhood: "Люлин",
    phone: "0888 223 328",
    workingHours: DAILY,
    site: null,
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQfSn22MS9ApDsd707ME-PabVcRIwA0_zY5h7KuWdaf2DCgamBYWXA9FFy4_qB-BzFmg5U&usqp=CAU",
    lat: 42.715,
    lng: 23.262,
  },
  {
    name: "Страйк Боулинг Център",
    sports: ["bowling"],
    address: "бул. Черни връх 100",
    city: "София",
    neighborhood: "Хладилника",
    phone: "0883 221 232",
    workingHours: DAILY,
    site: null,
    image: "https://mega-xtreme.com/wp-content/uploads/2020/07/IMG_0627-1-scaled.jpg",
    lat: 42.656,
    lng: 23.316,
  },
  // --- darts ---
  {
    name: "Дартс клуб Стрелата",
    sports: ["darts"],
    address: "ул. Граф Игнатиев 44",
    city: "София",
    neighborhood: "Център",
    phone: "0883 828 851",
    workingHours: DAILY,
    site: null,
    image:
      "https://cdn.akamai.steamstatic.com/steam/apps/720540/ss_1c55a2fb87ce40b877ac6c06700a418a271391d6.600x338.jpg?t=1514648459",
    lat: 42.689,
    lng: 23.33,
  },
  {
    name: "Дартс бар Фламинго",
    sports: ["darts"],
    address: "кв. Лозенец, ул. Златовръх 22",
    city: "София",
    neighborhood: "Лозенец",
    phone: "0883 814 388",
    workingHours: DAILY,
    site: null,
    image:
      "https://cdn.vox-cdn.com/thumbor/XQ2q-POTLrDR_St3uCO4sByWVt8=/0x0:5880x3881/1200x800/filters:focal(2470x1471:3410x2411)/cdn.vox-cdn.com/uploads/chorus_image/image/63872460/FlightClubChicago_Oche_13.1.0.jpg",
    lat: 42.669,
    lng: 23.323,
  },
  {
    name: "Дартс клуб 180",
    sports: ["darts"],
    address: "ж.к. Младост 1, бул. Андрей Сахаров 16",
    city: "София",
    neighborhood: "Младост",
    phone: "0882 183 888",
    workingHours: DAILY,
    site: null,
    image:
      "https://confidentials.com/uploads/imager/299deb39facbb0c50fa0371390d9cd0c/1201372/3e2b1654e3e90a30e1d8bc0e82b47c8a.jpg",
    lat: 42.654,
    lng: 23.376,
  },
  // --- football ---
  {
    name: "Игрище Локомотив",
    sports: ["football"],
    address: "кв. Надежда, ул. Христо Силянов 51",
    city: "София",
    neighborhood: "Надежда",
    phone: "0882 832 382",
    workingHours: DAILY,
    site: null,
    image: "https://lupa.bg/f/news/b/209/dcaaa28d63149460d4bba567ca18493d.jpeg",
    lat: 42.736,
    lng: 23.296,
  },
  {
    name: "Игрище Академика",
    sports: ["football"],
    address: "Студентски град, ул. Осми декември 15",
    city: "София",
    neighborhood: "Студентски град",
    phone: "0882 838 888",
    workingHours: DAILY,
    site: null,
    image: "https://lh5.googleusercontent.com/p/AF1QipPcEXfklrMWtogGKhTBF_glaHsLk4DXHZGzJqXz",
    lat: 42.651,
    lng: 23.345,
  },
  {
    name: "Игрище Уинслоу",
    sports: ["football"],
    address: "кв. Гео Милев, ул. Манастирска 3",
    city: "София",
    neighborhood: "Гео Милев",
    phone: "0882 831 888",
    workingHours: DAILY,
    site: null,
    image: "https://zasportaa.blog.bg/photos/175867/original/winslow%20sofia.jpg",
    lat: 42.679,
    lng: 23.353,
  },
  // --- ice skating ---
  {
    name: "Зимен дворец на спорта",
    sports: ["ice-skating"],
    address: "ул. Асен Йорданов 1",
    city: "София",
    neighborhood: "Изток",
    phone: "0885 631 288",
    workingHours: DAILY,
    site: null,
    image: "https://www.blackseaicearena.com/uploads/images/original/5_16.jpg",
    lat: 42.672,
    lng: 23.362,
  },
  {
    name: "Ледена пързалка Уинтър парк",
    sports: ["ice-skating"],
    address: "ж.к. Младост 4, ул. Бизнес парк София 5",
    city: "София",
    neighborhood: "Младост",
    phone: "0884 122 900",
    workingHours: DAILY,
    site: null,
    image: "https://lh5.googleusercontent.com/p/AF1QipNqA8x2FLXzKpRFJGXmAFZ8G1gWxez5AHg6qx3S",
    lat: 42.628,
    lng: 23.376,
  },
  {
    name: "Ледена пързалка Ариана",
    sports: ["ice-skating"],
    address: "Борисова градина, езеро Ариана",
    city: "София",
    neighborhood: "Оборище",
    phone: "0887 402 106",
    workingHours: DAILY,
    site: null,
    image: "https://peika.bg/pictures/80447_715__3.jpg",
    lat: 42.69,
    lng: 23.337,
  },
  // --- karting ---
  {
    name: "Картинг писта София",
    sports: ["karting"],
    address: "бул. Цариградско шосе 276",
    city: "София",
    neighborhood: "Горубляне",
    phone: "0882 831 883",
    workingHours: DAILY,
    site: null,
    image: "https://static.pochivka.bg/sights.bgstay.com/images/00/464/54c3de6e18efe.jpg",
    lat: 42.639,
    lng: 23.409,
  },
  {
    name: "Картинг арена Индор",
    sports: ["karting"],
    address: "ж.к. Люлин, бул. Европа 171",
    city: "София",
    neighborhood: "Люлин",
    phone: "0882 831 884",
    workingHours: DAILY,
    site: null,
    image: "https://funsport.bg/upload/services/428427-334066536672303-431553841-n.jpg",
    lat: 42.725,
    lng: 23.248,
  },
  {
    name: "Картинг клуб Спийд",
    sports: ["karting"],
    address: "бул. История славянобългарска 21",
    city: "София",
    neighborhood: "Военна рампа",
    phone: "0882 831 885",
    workingHours: DAILY,
    site: null,
    image: "https://funsport.bg/upload/services/1506475-805379079541044-7248382600949647346-n.jpg",
    lat: 42.72,
    lng: 23.308,
  },
  // --- padel ---
  {
    name: "Падел кортове София",
    sports: ["padel"],
    address: "Студентски град, бул. Акад. Борис Стефанов 20",
    city: "София",
    neighborhood: "Студентски град",
    phone: "0882 831 823",
    workingHours: DAILY,
    site: null,
    image: "https://tennis.bg/uploaded/posts/ddb1a51a961d473ad9f8bd0f13dccda1.jpg",
    lat: 42.648,
    lng: 23.347,
  },
  {
    name: "Падел клуб Запад",
    sports: ["padel"],
    address: "кв. Овча купел, ул. Промишлена 33",
    city: "София",
    neighborhood: "Овча купел",
    phone: "0882 831 831",
    workingHours: DAILY,
    site: null,
    image: "https://goguide.bg/wp-content/uploads/1600958479decathloncover.jpg",
    lat: 42.674,
    lng: 23.255,
  },
  {
    name: "Падел арена Юг",
    sports: ["padel"],
    address: "кв. Хладилника, ул. Сребърна 14",
    city: "София",
    neighborhood: "Хладилника",
    phone: "0883 283 188",
    workingHours: DAILY,
    site: null,
    image: "https://goguide.bg/wp-content/uploads/1600958479decathloncover.jpg",
    lat: 42.654,
    lng: 23.32,
  },
  // --- paintball ---
  {
    name: "Пейнтбол арена Симеоново",
    sports: ["paintball"],
    address: "кв. Симеоново, местност Камбаните",
    city: "София",
    neighborhood: "Симеоново",
    phone: "0888 320 831",
    workingHours: DAILY,
    site: null,
    image: "https://www.paintball-brno.cz/wp-content/uploads/2020/10/foto-paintball-hall-paintball_brno-11.jpg",
    lat: 42.618,
    lng: 23.335,
  },
  {
    name: "Пейнтбол клуб Адреналин",
    sports: ["paintball"],
    address: "кв. Драгалевци, ул. Папрат 12",
    city: "София",
    neighborhood: "Драгалевци",
    phone: "0888 232 831",
    workingHours: DAILY,
    site: null,
    image: "https://www.paintball-brno.cz/wp-content/uploads/2020/03/paintball-hala-brno-01-1.jpg",
    lat: 42.622,
    lng: 23.308,
  },
  {
    name: "Пейнтбол поле Банкя",
    sports: ["paintball"],
    address: "гр. Банкя, ул. Липа 9",
    city: "София",
    neighborhood: "Банкя",
    phone: "0888 132 831",
    workingHours: DAILY,
    site: null,
    image: "https://i0.wp.com/www.narozlucku.cz/wp-content/uploads/2017/03/obr2025.jpg?fit=690%2C460&ssl=1",
    lat: 42.707,
    lng: 23.147,
  },
  // --- running ---
  {
    name: "Атлетическа писта Васил Левски",
    sports: ["running"],
    address: "бул. Евлоги и Христо Георгиеви 38",
    city: "София",
    neighborhood: "Средец",
    phone: "0888 132 842",
    workingHours: DAILY,
    site: null,
    image: "https://visitsofia.bg/images/vegas_media/category30000/object366/34265c9d0e2600acea3b0f474485daef.jpg",
    lat: 42.688,
    lng: 23.335,
  },
  {
    name: "Южен парк — алеи за бягане",
    sports: ["running"],
    address: "кв. Иван Вазов, ул. Емил Берсински 5",
    city: "София",
    neighborhood: "Иван Вазов",
    phone: "0888 132 312",
    workingHours: DAILY,
    site: null,
    image: "https://visitsofia.bg/images/vegas_media/category30000/object366/34265c9d0e2600acea3b0f474485daef.jpg",
    lat: 42.676,
    lng: 23.311,
  },
  {
    name: "Северен парк — писта",
    sports: ["running"],
    address: "кв. Надежда, ул. Народни будители 2",
    city: "София",
    neighborhood: "Надежда",
    phone: "0888 198 323",
    workingHours: DAILY,
    site: null,
    image: "https://visitsofia.bg/images/vegas_media/category30000/object366/34265c9d0e2600acea3b0f474485daef.jpg",
    lat: 42.742,
    lng: 23.287,
  },
  // --- ski: real resort locations make the distance sort meaningful ---
  {
    name: "Ски зона Витоша — Алеко",
    sports: ["ski"],
    address: "Природен парк Витоша, хижа Алеко",
    city: "София",
    neighborhood: "Витоша",
    phone: "0888 198 343",
    workingHours: RESORT,
    site: null,
    image: "https://littlebg.com/wp-content/uploads/2016/12/borovec.jpg",
    lat: 42.568,
    lng: 23.29,
  },
  {
    name: "Ски курорт Боровец",
    sports: ["ski"],
    address: "к.к. Боровец, община Самоков",
    city: "Боровец",
    neighborhood: "Боровец",
    phone: "0888 198 232",
    workingHours: RESORT,
    site: null,
    image:
      "https://www.travelnews.bg//pic/posts/2021-10/16347990025367/gals/%D0%B1%D0%BE%D1%80%D0%BE%D0%B2%D0%B5%D1%86.jpg",
    lat: 42.267,
    lng: 23.606,
  },
  {
    name: "Ски курорт Банско",
    sports: ["ski"],
    address: "ул. Пирин 92",
    city: "Банско",
    neighborhood: "Банско",
    phone: "0888 198 122",
    workingHours: RESORT,
    site: null,
    image: "https://luckybansko.bg/wp-content/uploads/2017/09/bansko-ski-768x512-1-500x334.jpg",
    lat: 41.83,
    lng: 23.479,
  },
  // --- snowboard ---
  {
    name: "Сноуборд парк Витоша",
    sports: ["snowboard"],
    address: "Природен парк Витоша, Офелиите",
    city: "София",
    neighborhood: "Витоша",
    phone: "0888 312 122",
    workingHours: RESORT,
    site: null,
    image: "https://pateshestvenik.com/wp-content/uploads/2019/10/la-plagne2.jpg",
    lat: 42.576,
    lng: 23.275,
  },
  {
    name: "Сноуборд зона Боровец",
    sports: ["snowboard"],
    address: "к.к. Боровец, писта Ситняково",
    city: "Боровец",
    neighborhood: "Боровец",
    phone: "0881 329 831",
    workingHours: RESORT,
    site: null,
    image: "https://pateshestvenik.com/wp-content/uploads/2019/10/la-plagne2.jpg",
    lat: 42.27,
    lng: 23.61,
  },
  {
    name: "Сноуборд парк Банско",
    sports: ["snowboard"],
    address: "зона Шилигарника",
    city: "Банско",
    neighborhood: "Банско",
    phone: "0881 983 122",
    workingHours: RESORT,
    site: null,
    image: "https://pateshestvenik.com/wp-content/uploads/2019/10/la-plagne2.jpg",
    lat: 41.782,
    lng: 23.468,
  },
  // --- squash ---
  {
    name: "Скуош клуб Европа",
    sports: ["squash"],
    address: "кв. Дружба, бул. Искърско шосе 7",
    city: "София",
    neighborhood: "Дружба",
    phone: "0898 312 213",
    workingHours: DAILY,
    site: null,
    image: "https://www.tce.bg/js/backend/tiny_mce/plugins/ajaxfilemanager/upload/DSC_4639-small.gif",
    lat: 42.6618,
    lng: 23.3872,
  },
  {
    name: "Скуош кортове Изток",
    sports: ["squash"],
    address: "кв. Изток, ул. Тинтява 15",
    city: "София",
    neighborhood: "Изток",
    phone: "0898 313 222",
    workingHours: DAILY,
    site: null,
    image: "https://m2.spitogatos.gr/168537121_1600x1200.jpg?v=20130730",
    lat: 42.67,
    lng: 23.35,
  },
  {
    name: "Скуош център Триада",
    sports: ["squash"],
    address: "кв. Гео Милев, ул. Иван Щерев 8",
    city: "София",
    neighborhood: "Гео Милев",
    phone: "0891 283 122",
    workingHours: DAILY,
    site: null,
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTy-QbN0HtLVCiiT1p76_EM2RDY-bAim-0bI9H9l9akviGvYhxD054c6tg5m75H9yr5lqU&usqp=CAU",
    lat: 42.68,
    lng: 23.355,
  },
  // --- table tennis ---
  {
    name: "Клуб по тенис на маса София",
    sports: ["table-tennis"],
    address: "кв. Красно село, ул. Дебър 34",
    city: "София",
    neighborhood: "Красно село",
    phone: "0891 283 121",
    workingHours: DAILY,
    site: null,
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQigEvKAZLse9HicbWahzNRyNVzisaWMeWEsihTiTbgZdwqnDDdzxQmxxbybKkq-zkMelU&usqp=CAU",
    lat: 42.679,
    lng: 23.287,
  },
  {
    name: "Тенис на маса Олимпия",
    sports: ["table-tennis"],
    address: "ж.к. Младост 2, ул. Свети Киприян 44",
    city: "София",
    neighborhood: "Младост",
    phone: "0891 283 212",
    workingHours: DAILY,
    site: null,
    image: "https://benefitsystems.bg/wp-content/uploads/2022/03/Tenis-na-masa-Olympia-2-scaled.jpg",
    lat: 42.644,
    lng: 23.382,
  },
  {
    name: "Академия по тенис на маса",
    sports: ["table-tennis"],
    address: "Студентски град, ул. Проф. Кирил Попов 18",
    city: "София",
    neighborhood: "Студентски град",
    phone: "0897 831 229",
    workingHours: DAILY,
    site: null,
    image: "https://theacademy.bg/wp-content/uploads/2015/03/IMG_3153.jpg",
    lat: 42.649,
    lng: 23.348,
  },
  // --- tennis ---
  {
    name: "Тенис академия Малинова долина",
    sports: ["tennis"],
    address: "кв. Малинова долина, ул. Проф. Стоян Велев 11",
    city: "София",
    neighborhood: "Малинова долина",
    phone: "0897 831 227",
    workingHours: DAILY,
    site: null,
    image: "https://mdss.bg/wp-content/uploads/2012/06/Tenis-akademia-malinova-dolina-hard-kort-1024x650.jpg",
    lat: 42.632,
    lng: 23.355,
  },
  {
    name: "Тенис кортове Герамис",
    sports: ["tennis"],
    address: "кв. Гоце Делчев, ул. Метличина поляна 14",
    city: "София",
    neighborhood: "Гоце Делчев",
    phone: "0897 128 312",
    workingHours: DAILY,
    site: null,
    image:
      "https://www.geramis.bg/wp-content/uploads/2017/11/15085577_1223670441056080_6183557181550351092_n.jpg",
    lat: 42.667,
    lng: 23.296,
  },
  {
    name: "Тенис клуб Бояна",
    sports: ["tennis"],
    address: "кв. Бояна, ул. Кумата 6",
    city: "София",
    neighborhood: "Бояна",
    phone: "0897 128 322",
    workingHours: DAILY,
    site: null,
    image: "https://easybuildbg.com/wp-content/uploads/2016/05/ADIS-Boiana-18-1024x768.jpg",
    lat: 42.644,
    lng: 23.266,
  },
  // --- volleyball ---
  {
    name: "Волейболна зала Васил Левски",
    sports: ["volleyball"],
    address: "бул. Евлоги и Христо Георгиеви 38",
    city: "София",
    neighborhood: "Средец",
    phone: "0896 128 312",
    workingHours: DAILY,
    site: null,
    image: "https://volleymaritza.bg/wp-content/uploads/2017/12/VasilLevski_Inside.jpg",
    lat: 42.6875,
    lng: 23.3345,
  },
  {
    name: "Волейболна зала Триадица",
    sports: ["volleyball"],
    address: "ул. Алабин 50",
    city: "София",
    neighborhood: "Център",
    phone: "0895 192 229",
    workingHours: DAILY,
    site: null,
    image:
      "https://gradat.bg/sites/default/files/styles/article_media_embed/public/viber_image_2021-01-29_22-53-21.jpg?itok=DaNJI0En",
    lat: 42.695,
    lng: 23.319,
  },
  {
    name: "Волейболна зала Багира",
    sports: ["volleyball"],
    address: "кв. Стрелбище, ул. Твърдишки проход 23",
    city: "София",
    neighborhood: "Стрелбище",
    phone: "0894 191 289",
    workingHours: DAILY,
    site: null,
    image: "https://hotelbagira.bg/thumbs/3/20171218151858_DSC06991.JPG",
    lat: 42.669,
    lng: 23.299,
  },
  // --- wall climbing ---
  {
    name: "Стена за катерене Европа",
    sports: ["wall-climbing"],
    address: "кв. Дружба, бул. Искърско шосе 7",
    city: "София",
    neighborhood: "Дружба",
    phone: "0893 191 289",
    workingHours: DAILY,
    site: null,
    image: "https://climbing.sportcentereurope.bg/wp-content/uploads/2021/10/IMG_0074-1024x683.jpg",
    lat: 42.6616,
    lng: 23.3874,
  },
  {
    name: "Катерачна зала Боулдър",
    sports: ["wall-climbing"],
    address: "кв. Хиподрума, ул. Софийски герой 13",
    city: "София",
    neighborhood: "Хиподрума",
    phone: "0892 191 289",
    workingHours: DAILY,
    site: null,
    image: "https://visitsofia.bg/images/vegas_media/category30000/object2855/4e8c2d219926dc055ed5db469a61e011.jpg",
    lat: 42.674,
    lng: 23.292,
  },
  {
    name: "Катерачен център Вертикал",
    sports: ["wall-climbing"],
    address: "ж.к. Люлин 10, бул. Петър Дертлиев 42",
    city: "София",
    neighborhood: "Люлин",
    phone: "0891 191 289",
    workingHours: DAILY,
    site: null,
    image: "https://www.360mag.bg/wp-content/uploads/2016/03/MG_8132.jpg",
    lat: 42.718,
    lng: 23.27,
  },
];
```

- [ ] **Step 5: Write the seeding function**

Create `server/src/seed/places.ts`:

```typescript
import { Place } from "../models/Place";
import { PLACES_SEED } from "./placesData";

/**
 * Idempotent boot seed for the curated venue catalogue. Safe because the
 * catalogue is read-only: no user writes means the count guard can never
 * skip a legitimate re-seed. createIndexes() runs unconditionally so the
 * 2dsphere index $geoNear depends on exists even when the collection was
 * dropped (tests) or the process is a fresh dev:memory boot.
 */
export async function seedPlaces(): Promise<void> {
  await Place.createIndexes();
  const count = await Place.countDocuments({});
  if (count > 0) {
    return;
  }
  await Place.insertMany(
    PLACES_SEED.map(({ lat, lng, ...venue }) => ({
      ...venue,
      location: { type: "Point", coordinates: [lng, lat] },
    })),
  );
}
```

- [ ] **Step 6: Wire the seed into server boot**

Modify `server/src/index.ts` — add the import and call `seedPlaces()` right after `connectDb`:

```typescript
import http from "node:http";
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
  const app = createApp(sessionMiddleware);
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

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test -w server`
Expected: PASS — 42 tests (39 existing + 3 new).

- [ ] **Step 8: Commit**

```bash
git add server/src/models/Place.ts server/src/seed/placesData.ts server/src/seed/places.ts server/src/index.ts server/tests/places.seed.test.ts
git commit -m "feat(server): Place model, curated 54-venue seed, boot seeding"
```

---

### Task 3: GET /api/places — filters + $geoNear

**Files:**
- Create: `server/src/util/escapeRegExp.ts`
- Create: `server/src/routes/places.ts`
- Create: `server/tests/places.search.test.ts`
- Modify: `server/src/routes/users.ts` (use the extracted helper)
- Modify: `server/src/app.ts` (mount the router)

**Interfaces:**
- Consumes: `searchPlacesQuerySchema`/`SearchPlacesQuery` (Task 1); `Place`, `toPublicPlace`, `PlaceFields`, `PlaceLean` (Task 2); existing `requireAuth`, `validateQuery`.
- Produces: `GET /api/places` responding `{ places: PublicPlace[] }`; `escapeRegExp(value: string): string` from `server/src/util/escapeRegExp.ts` (also consumed by `routes/users.ts`).

- [ ] **Step 1: Write the failing tests**

Create `server/tests/places.search.test.ts`:

```typescript
import type { ActivityKey } from "@sports-match/shared";
import type { Express } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { Place } from "../src/models/Place";
import { setupTestDb } from "./helpers";

setupTestDb();

async function loggedInAgent(app: Express): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send({ username: "mira", password: "Secret1" });
  return agent;
}

interface FixturePlace {
  name: string;
  sports: ActivityKey[];
  address?: string;
  lat: number;
  lng: number;
}

async function insertPlaces(fixtures: FixturePlace[]): Promise<void> {
  // $geoNear needs the 2dsphere index, and dropDatabase between tests
  // removes it — recreate before every fixture insert.
  await Place.createIndexes();
  await Place.insertMany(
    fixtures.map((f) => ({
      name: f.name,
      sports: f.sports,
      address: f.address ?? "ул. Тестова 1",
      city: "София",
      neighborhood: "Тест",
      phone: "0888 000 000",
      workingHours: "Понеделник - неделя: 06:00 - 23:00",
      site: null,
      image: null,
      location: { type: "Point", coordinates: [f.lng, f.lat] },
    })),
  );
}

describe("GET /api/places", () => {
  it("returns all places sorted by name, without distanceKm, when no filters are given", async () => {
    const app = createApp();
    const me = await loggedInAgent(app);
    await insertPlaces([
      { name: "Gamma", sports: ["tennis"], lat: 42.7, lng: 23.3 },
      { name: "Alpha", sports: ["bowling"], lat: 42.7, lng: 23.3 },
      { name: "Beta", sports: ["darts"], lat: 42.7, lng: 23.3 },
    ]);
    const res = await me.get("/api/places");
    expect(res.status).toBe(200);
    expect(res.body.places.map((p: { name: string }) => p.name)).toEqual(["Alpha", "Beta", "Gamma"]);
    expect(res.body.places[0].distanceKm).toBeUndefined();
    expect(res.body.places[0].lat).toBeCloseTo(42.7);
    expect(res.body.places[0].lng).toBeCloseTo(23.3);
  });

  it("filters by sport", async () => {
    const app = createApp();
    const me = await loggedInAgent(app);
    await insertPlaces([
      { name: "Корт", sports: ["tennis"], lat: 42.7, lng: 23.3 },
      { name: "Зала", sports: ["bowling"], lat: 42.7, lng: 23.3 },
    ]);
    const res = await me.get("/api/places?sport=tennis");
    expect(res.body.places.map((p: { name: string }) => p.name)).toEqual(["Корт"]);
  });

  it("finds a billiards hall under both snooker and pool", async () => {
    const app = createApp();
    const me = await loggedInAgent(app);
    await insertPlaces([{ name: "Билярд", sports: ["snooker", "pool"], lat: 42.7, lng: 23.3 }]);
    const snooker = await me.get("/api/places?sport=snooker");
    const pool = await me.get("/api/places?sport=pool");
    expect(snooker.body.places).toHaveLength(1);
    expect(pool.body.places).toHaveLength(1);
  });

  it("matches Cyrillic q against the name case-insensitively", async () => {
    const app = createApp();
    const me = await loggedInAgent(app);
    await insertPlaces([
      { name: "Бадминтон зала Люлин", sports: ["badminton"], lat: 42.7, lng: 23.3 },
      { name: "Тенис клуб", sports: ["tennis"], lat: 42.7, lng: 23.3 },
    ]);
    const res = await me.get(`/api/places?q=${encodeURIComponent("бадминтон")}`);
    expect(res.body.places.map((p: { name: string }) => p.name)).toEqual(["Бадминтон зала Люлин"]);
  });

  it("matches q against the address too", async () => {
    const app = createApp();
    const me = await loggedInAgent(app);
    await insertPlaces([
      { name: "Зала А", sports: ["darts"], address: "кв. Дружба, ул. Тестова 5", lat: 42.7, lng: 23.3 },
      { name: "Зала Б", sports: ["darts"], address: "ж.к. Люлин, ул. Тестова 6", lat: 42.7, lng: 23.3 },
    ]);
    const res = await me.get(`/api/places?q=${encodeURIComponent("дружба")}`);
    expect(res.body.places.map((p: { name: string }) => p.name)).toEqual(["Зала А"]);
  });

  it("combines sport and q with AND", async () => {
    const app = createApp();
    const me = await loggedInAgent(app);
    await insertPlaces([
      { name: "Тенис Дружба", sports: ["tennis"], lat: 42.7, lng: 23.3 },
      { name: "Тенис Люлин", sports: ["tennis"], lat: 42.7, lng: 23.3 },
      { name: "Дартс Дружба", sports: ["darts"], lat: 42.7, lng: 23.3 },
    ]);
    const res = await me.get(`/api/places?sport=tennis&q=${encodeURIComponent("Дружба")}`);
    expect(res.body.places.map((p: { name: string }) => p.name)).toEqual(["Тенис Дружба"]);
  });

  it("sorts by distance and reports ascending distanceKm when lat/lng are given", async () => {
    const app = createApp();
    const me = await loggedInAgent(app);
    await insertPlaces([
      { name: "Далече", sports: ["tennis"], lat: 42.267, lng: 23.606 },
      { name: "Близо", sports: ["tennis"], lat: 42.69, lng: 23.32 },
      { name: "Средно", sports: ["tennis"], lat: 42.656, lng: 23.377 },
    ]);
    const res = await me.get("/api/places?lat=42.6852&lng=23.319");
    expect(res.status).toBe(200);
    expect(res.body.places.map((p: { name: string }) => p.name)).toEqual(["Близо", "Средно", "Далече"]);
    const distances = res.body.places.map((p: { distanceKm: number }) => p.distanceKm);
    expect(distances[0]).toBeLessThan(2);
    expect(distances[2]).toBeGreaterThan(20);
    expect([...distances].sort((a: number, b: number) => a - b)).toEqual(distances);
  });

  it("applies the sport filter inside a near query", async () => {
    const app = createApp();
    const me = await loggedInAgent(app);
    await insertPlaces([
      { name: "Тенис близо", sports: ["tennis"], lat: 42.69, lng: 23.32 },
      { name: "Дартс още по-близо", sports: ["darts"], lat: 42.6852, lng: 23.319 },
    ]);
    const res = await me.get("/api/places?lat=42.6852&lng=23.319&sport=tennis");
    expect(res.body.places.map((p: { name: string }) => p.name)).toEqual(["Тенис близо"]);
  });

  it("treats a regex-special q literally", async () => {
    const app = createApp();
    const me = await loggedInAgent(app);
    await insertPlaces([{ name: "Plain", sports: ["tennis"], lat: 42.7, lng: 23.3 }]);
    const res = await me.get(`/api/places?q=${encodeURIComponent(".*")}`);
    expect(res.status).toBe(200);
    expect(res.body.places).toEqual([]);
  });

  it("rejects an unknown sport key with 400", async () => {
    const app = createApp();
    const me = await loggedInAgent(app);
    const res = await me.get("/api/places?sport=quidditch");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects lat without lng with 400", async () => {
    const app = createApp();
    const me = await loggedInAgent(app);
    const res = await me.get("/api/places?lat=42.7");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("requires authentication", async () => {
    const res = await request(createApp()).get("/api/places");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("caps results at 100", async () => {
    const app = createApp();
    const me = await loggedInAgent(app);
    await insertPlaces(
      Array.from({ length: 101 }, (_, i) => ({
        name: `p${String(i).padStart(3, "0")}`,
        sports: ["tennis"] as ActivityKey[],
        lat: 42.7,
        lng: 23.3,
      })),
    );
    const res = await me.get("/api/places");
    expect(res.status).toBe(200);
    expect(res.body.places).toHaveLength(100);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -w server -- tests/places.search.test.ts`
Expected: FAIL — the route does not exist yet (404s / import errors).

- [ ] **Step 3: Extract escapeRegExp**

Create `server/src/util/escapeRegExp.ts`:

```typescript
/** Escapes regex metacharacters so user text is matched literally. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
```

Modify `server/src/routes/users.ts`: delete its private `escapeRegExp` function (lines 15–17) and add the import:

```typescript
import { escapeRegExp } from "../util/escapeRegExp";
```

- [ ] **Step 4: Write the places router**

Create `server/src/routes/places.ts`:

```typescript
import { searchPlacesQuerySchema, type SearchPlacesQuery } from "@sports-match/shared";
import { Router } from "express";
import type { FilterQuery } from "mongoose";
import { requireAuth } from "../middleware/requireAuth";
import { validateQuery } from "../middleware/validateQuery";
import { Place, toPublicPlace, type PlaceFields, type PlaceLean } from "../models/Place";
import { escapeRegExp } from "../util/escapeRegExp";

export const placesRouter = Router();

// Documented cap (see phase 4 spec): no pagination at catalogue scale.
const PLACES_RESULT_CAP = 100;

placesRouter.get("/", requireAuth, validateQuery(searchPlacesQuerySchema), async (_req, res) => {
  // Express 5's req.query is a read-only getter; validateQuery parks the parsed result here.
  const { sport, q, lat, lng } = res.locals.query as SearchPlacesQuery;

  const filter: FilterQuery<PlaceFields> = {};
  if (sport) {
    filter.sports = sport;
  }
  if (q) {
    const pattern = escapeRegExp(q);
    filter.$or = [
      { name: { $regex: pattern, $options: "i" } },
      { address: { $regex: pattern, $options: "i" } },
    ];
  }

  if (lat !== undefined && lng !== undefined) {
    // $geoNear must be the first pipeline stage, so the filters ride along
    // as its query option instead of a separate $match. Results come back
    // in ascending distance order with the distance in meters.
    const nearby = await Place.aggregate<PlaceLean & { distance: number }>([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "distance",
          spherical: true,
          query: filter,
        },
      },
      { $limit: PLACES_RESULT_CAP },
    ]);
    res.json({ places: nearby.map((place) => toPublicPlace(place, place.distance)) });
    return;
  }

  const places = await Place.find(filter).sort({ name: 1 }).limit(PLACES_RESULT_CAP).lean<PlaceLean[]>();
  res.json({ places: places.map((place) => toPublicPlace(place)) });
});
```

- [ ] **Step 5: Mount the router**

Modify `server/src/app.ts` — add the import and mount (full file):

```typescript
import express from "express";
import { errorHandler, notFoundHandler } from "./errors";
import { authRouter } from "./routes/auth";
import { messagesRouter } from "./routes/messages";
import { placesRouter } from "./routes/places";
import { usersRouter } from "./routes/users";
import { createSessionMiddleware } from "./session";

export function createApp(
  sessionMiddleware: express.RequestHandler = createSessionMiddleware(),
): express.Express {
  const app = express();
  app.set("trust proxy", 1);
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

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 6: Run the full server suite to verify everything passes**

Run: `npm test -w server`
Expected: PASS — 55 tests (42 after Task 2 + 13 new). The existing `users.search` tests confirm the `escapeRegExp` extraction broke nothing.

- [ ] **Step 7: Commit**

```bash
git add server/src/util/escapeRegExp.ts server/src/routes/places.ts server/src/routes/users.ts server/src/app.ts server/tests/places.search.test.ts
git commit -m "feat(server): GET /api/places with sport/text filters and \$geoNear near-me"
```

---

### Task 4: Client places API, styles port, PlacesCard, sport options

**Files:**
- Create: `client/src/api/places.ts`
- Create: `client/src/api/places.test.ts`
- Create: `client/src/components/PlacesCard/PlacesCard.scss` (byte-identical port)
- Create: `client/src/components/PlacesCard/PlacesCard.tsx`
- Create: `client/src/pages/Places/Places.scss` (byte-identical port + documented append)
- Create: `client/src/pages/Places/sportOptions.ts`
- Create: `client/src/pages/Places/sportOptions.test.ts`

**Interfaces:**
- Consumes: `PublicPlace`, `ActivityKey` (Task 1); `request` from `client/src/api/http.ts`; `CLIENT_ACTIVITIES`, `ClientActivity` from `client/src/activities/catalogue.ts`.
- Produces: `searchPlaces(params: SearchPlacesParams): Promise<PublicPlace[]>` with `SearchPlacesParams = { sport?: ActivityKey; q?: string; lat?: number; lng?: number }`; `PlacesCard` component with props `{ place: PublicPlace; fallbackImage: string }`; `sportOptionsFrom(places: PublicPlace[]): ClientActivity[]`. Task 5's page consumes all three.

- [ ] **Step 1: Write the failing tests**

Create `client/src/api/places.test.ts`:

```typescript
import { afterEach, describe, expect, it, vi } from "vitest";
import { searchPlaces } from "./places";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("searchPlaces", () => {
  it("builds the query string from defined params only", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ places: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await searchPlaces({ sport: "tennis", q: "hall", lat: 42.7, lng: 23.3 });
    expect(fetchMock).toHaveBeenCalledWith("/api/places?sport=tennis&q=hall&lat=42.7&lng=23.3", expect.anything());

    await searchPlaces({});
    expect(fetchMock).toHaveBeenLastCalledWith("/api/places", expect.anything());
  });
});
```

Create `client/src/pages/Places/sportOptions.test.ts`:

```typescript
import type { PublicPlace } from "@sports-match/shared";
import { describe, expect, it } from "vitest";
import { sportOptionsFrom } from "./sportOptions";

function place(sports: PublicPlace["sports"]): PublicPlace {
  return {
    id: "x",
    name: "Зала",
    sports,
    address: "ул. Тестова 1",
    city: "София",
    neighborhood: "Център",
    phone: "0888 000 000",
    workingHours: "Понеделник - неделя: 06:00 - 23:00",
    site: null,
    image: null,
    lat: 42.7,
    lng: 23.3,
  };
}

describe("sportOptionsFrom", () => {
  it("dedupes sports across venues and sorts by label", () => {
    const options = sportOptionsFrom([
      place(["tennis"]),
      place(["badminton", "tennis"]),
      place(["snooker", "pool"]),
    ]);
    expect(options.map((o) => o.key)).toEqual(["badminton", "pool", "snooker", "tennis"]);
    expect(options.every((o) => o.label.length > 0 && o.image.length > 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -w client`
Expected: FAIL — cannot resolve `./places` and `./sportOptions`.

- [ ] **Step 3: Write the API client and sport options helper**

Create `client/src/api/places.ts`:

```typescript
import type { ActivityKey, PublicPlace } from "@sports-match/shared";
import { request } from "./http";

export interface SearchPlacesParams {
  sport?: ActivityKey;
  q?: string;
  lat?: number;
  lng?: number;
}

export async function searchPlaces(params: SearchPlacesParams): Promise<PublicPlace[]> {
  const query = new URLSearchParams();
  if (params.sport) {
    query.set("sport", params.sport);
  }
  if (params.q) {
    query.set("q", params.q);
  }
  if (params.lat !== undefined && params.lng !== undefined) {
    query.set("lat", String(params.lat));
    query.set("lng", String(params.lng));
  }
  const qs = query.toString();
  const res = await request<{ places: PublicPlace[] }>(`/api/places${qs ? `?${qs}` : ""}`);
  return res.places;
}
```

Create `client/src/pages/Places/sportOptions.ts`:

```typescript
import type { PublicPlace } from "@sports-match/shared";
import { CLIENT_ACTIVITIES, type ClientActivity } from "../../activities/catalogue";

/**
 * The sports dropdown lists only sports that actually have venues — the
 * prototype derived this from its full JSON; here it comes from the first
 * unfiltered fetch. Sorted by label like the buddy search dropdown.
 */
export function sportOptionsFrom(places: PublicPlace[]): ClientActivity[] {
  const present = new Set(places.flatMap((place) => place.sports));
  return CLIENT_ACTIVITIES.filter((activity) => present.has(activity.key)).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -w client`
Expected: PASS — 14 tests (12 existing + 2 new).

- [ ] **Step 5: Port the two stylesheets byte-identical**

From the repo root:

```bash
git show prototype:src/components/PlacesCard/PlacesCard.scss > client/src/components/PlacesCard/PlacesCard.scss
git show prototype:src/pages/Places/Places.scss > client/src/pages/Places/Places.scss
```

Verify PlacesCard.scss is byte-identical:

```bash
git show prototype:src/components/PlacesCard/PlacesCard.scss | diff - client/src/components/PlacesCard/PlacesCard.scss
```

Expected: no output.

- [ ] **Step 6: Append the documented Near-me button styles**

Append to the **end** of `client/src/pages/Places/Places.scss` (this is the one sanctioned deviation from the byte-identical port — see the phase 4 spec, Section 3):

```scss

// Phase 4 addition (the one deliberate deviation from the prototype page):
// the "Near me" geolocation toggle, styled like the neighboring controls.
.placesPage .searchWrapper .nearMeButton {
    @include select();
    height: 40px;
    margin-left: 30px;
    cursor: pointer;

    &.active {
        color: $contrast-transperant;
        border-color: $contrast-transperant;
    }
}
```

(`$contrast-transperant` is the existing variable name from the prototype — spelled exactly like that in `_variables.scss`.)

- [ ] **Step 7: Write the PlacesCard component**

Create `client/src/components/PlacesCard/PlacesCard.tsx` (markup matches the prototype card; new: typed props, `site`/`image` nullability, image `onError` fallback, optional distance line):

```typescript
import type { PublicPlace } from "@sports-match/shared";
import { useState } from "react";
import "./PlacesCard.scss";

interface PlacesCardProps {
  place: PublicPlace;
  fallbackImage: string;
}

export default function PlacesCard({ place, fallbackImage }: PlacesCardProps) {
  // The seed's venue images are external hotlinks from the prototype; when
  // one dies, fall back to the local activity image so the card never shows
  // a broken-image icon.
  const [broken, setBroken] = useState(false);
  const src = !broken && place.image ? place.image : fallbackImage;
  return (
    <div className="sportPlaceCard">
      <div className="inner">
        <img width={250} src={src} alt="sportPlace" onError={() => setBroken(true)} />
        <h3>{place.name}</h3>
        {place.site && (
          <a
            href={place.site.startsWith("http") ? place.site : `http://${place.site}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {place.site}
          </a>
        )}
        <p>{place.address}</p>
        <p>{place.phone}</p>
        <p>{place.workingHours}</p>
        {place.distanceKm !== undefined && <p>{`📍 ${place.distanceKm} km away`}</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Type-check and run the client suite**

Run: `npm run build -w client` (type-checks) then `npm test -w client`
Expected: build succeeds; 14 tests pass.

- [ ] **Step 9: Commit**

```bash
git add client/src/api/places.ts client/src/api/places.test.ts client/src/components/PlacesCard client/src/pages/Places
git commit -m "feat(client): places API client, PlacesCard, ported styles"
```

---

### Task 5: Places page with Near me, route swap, ComingSoon retirement

**Files:**
- Create: `client/src/pages/Places/Places.tsx`
- Modify: `client/src/App.tsx`
- Delete: `client/src/pages/ComingSoon/ComingSoon.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: `searchPlaces`/`SearchPlacesParams`, `PlacesCard`, `sportOptionsFrom` (Task 4); `activityByKey`, `ClientActivity` from `client/src/activities/catalogue.ts`; `CustomAlert` (`client/src/components/CustomAlert/CustomAlert`, props `{ variant, message }`); `useDebounce` (`client/src/components/Utils/Debounce`).
- Produces: the live `/places` route. Nothing downstream.

- [ ] **Step 1: Write the page**

Create `client/src/pages/Places/Places.tsx` (structure, copy, and classNames match the prototype; new: real API data, venue-derived dropdown, Near me toggle):

```typescript
import type { PublicPlace } from "@sports-match/shared";
import { useEffect, useState } from "react";
import { activityByKey, type ClientActivity } from "../../activities/catalogue";
import * as placesApi from "../../api/places";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import PlacesCard from "../../components/PlacesCard/PlacesCard";
import useDebounce from "../../components/Utils/Debounce";
import { sportOptionsFrom } from "./sportOptions";
import "./Places.scss";

export default function PlacesPage() {
  const [places, setPlaces] = useState<PublicPlace[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedSport, setSelectedSport] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [sportOptions, setSportOptions] = useState<ClientActivity[]>([]);
  const [error, setError] = useState("");
  const debouncedSearchText = useDebounce(searchText, 300);

  useEffect(() => {
    let cancelled = false;
    const q = debouncedSearchText.trim() || undefined;
    // Select options come from the catalogue, so the value is a valid key or "".
    const sport = (selectedSport || undefined) as placesApi.SearchPlacesParams["sport"];
    const unfiltered = !sport && !q && !coords;
    placesApi
      .searchPlaces({ sport, q, ...(coords ?? {}) })
      .then((results) => {
        if (cancelled) {
          return;
        }
        setPlaces(results);
        setError("");
        if (unfiltered) {
          // Derive the dropdown from an unfiltered load only, so filtering
          // never shrinks the list of available options.
          setSportOptions(sportOptionsFrom(results));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPlaces([]);
          setError("Could not load places. Please try again.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSport, debouncedSearchText, coords]);

  const handleNearMe = () => {
    if (coords) {
      setCoords(null);
      return;
    }
    if (!("geolocation" in navigator)) {
      setError("Location is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setError("");
      },
      () => {
        setError("Could not get your location. Check the browser permission and try again.");
      },
    );
  };

  return (
    <div className="placesPage">
      <h2 style={{ display: "flex", justifyContent: "center" }} className="siteSloganTitle">
        Choose your favorite sport and get suggestions where to play in Sofia
      </h2>

      <div className="searchWrapper">
        <div>
          <input
            className="inputSearch"
            name="inputSearchField"
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Type to search"
          />
        </div>

        <div style={{ color: "white" }}>
          or / and
          <select
            className="selectSearch"
            name="inputSearchField"
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
          >
            <option value="">Choose sport category</option>
            {sportOptions.map((sport) => (
              <option key={sport.key} value={sport.key}>
                {sport.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <button
            type="button"
            className={coords ? "nearMeButton active" : "nearMeButton"}
            onClick={handleNearMe}
          >
            {coords ? "Near me ✓" : "Near me"}
          </button>
        </div>
      </div>

      {error && <CustomAlert variant="danger" message={error} />}

      {places.length > 0 ? (
        <div className="sportsPageContainer">
          {places.map((place) => (
            <div key={place.id}>
              <PlacesCard place={place} fallbackImage={activityByKey(place.sports[0])?.image ?? ""} />
            </div>
          ))}
        </div>
      ) : (
        !error && <div style={{ textAlign: "center", fontSize: 28 }}>No results</div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Swap the route and delete ComingSoon**

Modify `client/src/App.tsx`:
- Remove the line `import ComingSoon from "./pages/ComingSoon/ComingSoon";`
- Add `import PlacesPage from "./pages/Places/Places";` after the `MessagesPage` import.
- Replace `<Route path="/places" element={<ComingSoon feature="Places" />} />` with `<Route path="/places" element={<PlacesPage />} />`.

Delete the now-unused component:

```bash
git rm client/src/pages/ComingSoon/ComingSoon.tsx
```

- [ ] **Step 3: Update the README**

In `README.md`:
- Change the roadmap line `4. Places catalogue with geo search` to `4. ✅ Places catalogue with geo search`.
- Update the status paragraph (lines 7–9) to:

```markdown
**Status:** rebuilt from scratch as a full-stack TypeScript app — auth +
profiles, activities + buddy search, real-time chat, and the places
catalogue are all live. The original 2023 prototype lives on the
[`prototype`](../../tree/prototype) branch.
```

- [ ] **Step 4: Type-check and run every suite**

Run: `npm run build` then `npm test` (repo root)
Expected: build succeeds for all three workspaces; 96 tests pass (27 shared / 55 server / 14 client).

- [ ] **Step 5: Smoke-check dev boot**

Run: `npm run dev:memory` from the repo root; wait for `API listening on http://localhost:4000`; then `curl -s http://localhost:4000/api/health` → `{"status":"ok"}`. Stop the processes afterwards (Ctrl+C / kill). This confirms the boot-time seed doesn't crash a fresh in-memory server.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/Places/Places.tsx client/src/App.tsx README.md
git commit -m "feat(client): Places page with Near me — final prototype page live"
```

(The `git rm` from Step 2 is already staged.)
