# Phase 4 — Places Catalogue + Near Me — Design

**Date:** 2026-07-05
**Status:** Approved by Andrei (all four sections approved individually)
**Parent spec:** `2026-07-04-fullstack-rebuild-design.md`. **Baseline:** Phase 3
complete at commit `7f2475c` (71 tests: 20 shared / 39 server / 12 client).

## Goal

Port the prototype's Places page onto the real API: a curated catalogue of
Sofia sports venues served from MongoDB, filterable by sport and text, plus
a "Near me" mode that sorts venues by real distance from the browser's
location. Completes the "meet" step of the core loop (profile → match →
chat → meet) and retires the last ComingSoon page.

## Decisions made

| Decision | Choice | Why |
|---|---|---|
| Geo scope | Filters + "Near me" distance sort (no map view) | The "geo search" the README promises; MongoDB `$geoNear` makes it small. A map (Leaflet) would roughly double the phase — future work |
| Data source | Curated seed only, read-only API | Prototype parity (its JSON was hard-coded); user submissions need moderation/admin tooling the app doesn't have |
| Seed mechanics | Idempotent boot seed guarded by `countDocuments() === 0` | dev:memory gets data every fresh boot; Atlas seeds exactly once; restarts never duplicate. Safe because the catalogue is read-only |
| Venue sports | `sports: ActivityKey[]` (array of catalogue keys) | Prototype's 18 camelCase types map onto the 40-key catalogue; `billiards` venues carry `["snooker", "pool"]` and appear under both filters |
| Coordinates | Approximate neighborhood-level points, hand-assigned in the seed | Prototype has only street addresses (some placeholders); geocoding real addresses is out of scope. Documented as approximate |
| Wire format | Flat `lat`/`lng` numbers; GeoJSON `[lng, lat]` stays inside the Mongoose model | Quarantines GeoJSON's inverted coordinate order (a classic bug source) in the one layer that needs it for the 2dsphere index |
| Venue data locale | Bulgarian locale kept; placeholder fields curated | Only 7 of the 54 prototype venues have real data — the rest carry "Адрес", junk phone digits, and `www.example.com`. Shipping those verbatim would look broken. Curation: duplicate names made distinct, placeholder addresses/phones replaced with plausible fictional Sofia ones, `www.example.com` sites become `null`, ski/snowboard venues get real resort locations (Витоша, Боровец, Банско) so distance sort demonstrates properly |
| Result cap | 100, documented in code | YAGNI at 54 seeded venues; consistent with search's 50 and history's 100 |
| Access | `requireAuth`, `/places` stays in the RequireAuth route group | One auth story; the catalogue is part of the logged-in product loop |

## Section 1 — Shared contract

New `shared/src/places.ts`, re-exported from the shared index:

- `publicPlaceSchema` / `PublicPlace = { id, name, sports: ActivityKey[],
  address, city, neighborhood, phone, workingHours, site: string | null,
  image: string | null, lat: number, lng: number, distanceKm?: number }`.
  `distanceKm` is present only on "Near me" queries.
- `searchPlacesQuerySchema = { sport?: activityKey, q?: string (trimmed,
  max 100), lat?: number, lng?: number }` — coerces numbers (query strings
  arrive as strings), range-checks lat ±90 / lng ±180, and a `.refine`
  requires lat and lng together or not at all.
- Semantics: `q` matches name OR address (case-insensitive); `sport`
  filters by containment in `sports`; all present filters AND-combine —
  the same vocabulary as buddy search.

## Section 2 — Server

- **Place model** (`server/src/models/Place.ts`): name, sports
  (`[String]` enum-locked to `ACTIVITY_KEYS`), address, city, neighborhood,
  phone, workingHours, site, image, `location: { type: "Point",
  coordinates: [lng, lat] }` with a **2dsphere index**. `toPublicPlace()`
  flattens GeoJSON to `lat`/`lng`.
- **Seed** (`server/src/seed/places.ts` + `server/src/seed/placesData.ts`):
  the prototype's 54 venues as a typed array — sport types mapped to
  catalogue keys (`billiards` → `["snooker", "pool"]`), Bulgarian locale
  kept, placeholder fields curated per the decisions table, each venue
  given approximate neighborhood-level coordinates. `seedPlaces()` ensures
  the 2dsphere index exists (`createIndexes()`), then inserts only when
  the collection is empty; called from `main()` in `server/src/index.ts`
  right after `connectDb` (covers both normal boot and dev:memory).
- **API** — `GET /api/places` (mounted `/api/places`, `requireAuth`,
  `validateQuery(searchPlacesQuerySchema)`) → `{ places: PublicPlace[] }`:
  - Without coordinates: `find()` with filters, sorted by name ascending,
    cap 100.
  - With coordinates: `$geoNear` aggregation (filters passed as its
    `query` option — `$geoNear` must be the first pipeline stage), results
    in ascending distance order, meters converted to `distanceKm` rounded
    to 0.1 km, cap 100.
  - Text `q` regex-escaped, case-insensitive, name OR address (works with
    Cyrillic).
  - Unknown sport / unpaired or out-of-range coordinates → 400
    VALIDATION_ERROR; anonymous → 401. Standard error envelope.

## Section 3 — Client

- Ported byte-identical from the `prototype` branch: `Places.scss`,
  `PlacesCard.scss`; page structure with exact classNames (`placesPage`,
  `siteSloganTitle` with the verbatim slogan "Choose your favorite sport
  and get suggestions where to play in Sofia", `searchWrapper`,
  `inputSearch`, `selectSearch`, `sportsPageContainer`, `sportPlaceCard`,
  "No results" empty state). `PlacesCard` becomes typed `PlacesCard.tsx`,
  same markup.
- Data flow mirrors BuddySearch: `placesApi.searchPlaces({ sport?, q?,
  lat?, lng? })` builds a query string from defined params only; debounced
  text input + sport select refetch on change; unfiltered fetch on mount.
- The sport dropdown lists only sports that have venues, derived from the
  first unfiltered fetch (the prototype derived it from the full JSON) —
  no dead-end options.
- **"Near me"**: a button beside the filters (the one deliberate visual
  addition, styled with existing SCSS mixins).
  `navigator.geolocation.getCurrentPosition` → coords included in every
  subsequent query → cards re-sort by distance and show a distance line
  (only when `distanceKm` exists). Clicking again turns it off (back to
  name order). Permission denied / unavailable → CustomAlert, mode stays
  off.
- Card images are the prototype's external hotlinks; `onError` falls back
  to the local activity image of the venue's first sport.
- Route `/places` swaps from ComingSoon to the real page; ComingSoon (last
  usage) is deleted.

## Section 4 — Testing & success criteria

- **Shared:** coercion, lat/lng pairing refine, range checks, unknown
  sport rejected, `q` trim + max 100.
- **Server:** seed idempotency (running `seedPlaces()` twice leaves 54
  docs); unfiltered GET name-sorted and capped; sport filter incl. a
  billiards hall found under both `snooker` and `pool`; Cyrillic `q`
  matching name and address case-insensitively; sport+q AND; geo query
  from a known point → ascending `distanceKm`, plausible values, absent
  without coords; 400 unknown sport, 400 lat-without-lng; 401 anonymous.
- **Client:** `searchPlaces` query-string construction; sport-dropdown
  derivation from a fixture response. Page behavior human-verified.
- **Success criterion** (dev:memory): log in → Places shows 54 venues →
  sport filter works → Cyrillic text search works → "Near me" (allow
  location) re-orders cards with km badges.

## Out of scope (deliberate)

- Map view (Leaflet), user-submitted venues, venue detail pages,
  favorites/ratings, pagination past the cap, geocoding real street
  addresses, catalogue admin UI, venue photos hosted by us.
