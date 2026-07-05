# Orbit — Visual Redesign — Design

**Date:** 2026-07-05
**Status:** Approved by Andrei (direction chosen interactively via visual
companion: light theme → direction C "warm premium" → signature D1 "Orbit
radar"; applied-pages mockup approved with "Do it. We can tweak after that")
**Parent spec:** `2026-07-04-fullstack-rebuild-design.md`. **Baseline:**
Phase 4 complete at commit `3e445b9` (99 tests: 29 shared / 56 server / 14
client).

## Goal

Replace the ported prototype look (photo background, text-shadows, neon
accents, Bootstrap) with **Orbit**: a light, warm, modern design system
with one ownable signature — a radar motif derived from what the product
does (finding players near you). Presentation layer only: same features,
same data, same API, same routes. This spec supersedes the rebuild spec's
"port visual identity byte-identical" constraint for all client visuals.

## Decisions made

| Decision | Choice | Why |
|---|---|---|
| Base theme | Light only | Easiest to make feel polished/trustworthy; toggle deferred |
| Depth | Layouts recomposed too, functionality identical | Floating-over-background layouts can't look professional restyled in place |
| Direction | C "warm premium": ivory, rounded, soft shadows, Manrope | Chosen over clean-SaaS and bold-athletic in mockup comparison |
| Signature | D1 "Orbit": radar rings, sweep, pulsing dots | Derived from the product (proximity matching), not fashion; scales from hero radar to a single unread dot |
| Signature intensity | Hero radar (Home) → small scanner (search/empty states) → pulsing dot (unread) | Same motif, three intensities; never decorates without meaning |
| Bootstrap | Removed entirely (`bootstrap` + `react-bootstrap` uninstalled) | Biggest source of generic look + dead CSS weight; five consumers get own components |
| sweetalert2 | Kept, restyled with Orbit tokens | Working confirm/alert flows; replacement is churn without benefit |
| Fonts | Manrope variable via `@fontsource-variable/manrope` (self-hosted) | No Google Fonts request in production; Vite-native |
| Activity images | Existing PNGs kept, presented inside new cards | Geometric tile alternative (D2) not chosen; asset redesign out of scope |
| Mobile | Mobile-first responsive is a requirement, not a page | Enables PWA now and Capacitor wrap later (Andrei's Android/iOS question) |
| Motion | All signature animation behind `prefers-reduced-motion: reduce` guard | Accessibility; radar sweep/pulse become static rings/dots |
| Old assets | `gradient2.jpg`, `projectBackground3.png`, `11.mov`, `errorPage.gif` deleted | Background-image aesthetic retired; 404 gets an on-brand replacement |

## Section 1 — Design tokens (`client/src/styles/`)

New `client/src/styles/_tokens.scss` (replaces `_variables.scss`),
`_mixins.scss` (rewritten), `_base.scss` (body/typography/scrollbar/
reduced-motion; `index.scss` shrinks to imports). Exact values:

- **Surfaces:** bg `#FAF9F7`; surface `#FFFFFF`; borders `#E7E5E4`
  (strong) / `#EDEAE4` (soft).
- **Ink:** text `#1C1917`; soft `#57534E`; muted `#78716C`; faint
  `#A8A29E`.
- **Accent (indigo):** decorative `#6366F1`; interactive
  `#4F46E5` (buttons, links — meets contrast with white bold text);
  deep `#4338CA` (text on soft chips); soft `#EEF2FF` (chip/active
  backgrounds).
- **Secondary (amber):** `#F59E0B`; deep `#B45309`; soft `#FEF3C7`.
  Used for badges, second-accent dots, avatar-halo variety.
- **Status:** success `#059669`; danger `#DC2626`; danger-soft `#FEE2E2`.
- **Radar rings:** `rgba(99,102,241,.16 / .26 / .36)` outer→inner; sweep
  `conic-gradient(from 0deg, rgba(99,102,241,.18), transparent 65deg)`.
- **Shape:** cards 18px; chat bubbles 16px (4px on the "tail" corner);
  buttons/inputs/tags pill (999px).
- **Shadows:** card `0 8px 24px rgba(28,25,23,.07)`; pop
  `0 12px 32px rgba(28,25,23,.12)`. No text-shadows anywhere.
- **Type:** Manrope 400/600/700/800; base 16px; headings 800 with
  `-0.03em` tracking; display sizes via `clamp()`.
- **Focus:** every interactive element gets a visible
  `:focus-visible` ring (2px `#4F46E5`, 2px offset) — the current
  global `*:focus { outline: none }` is removed.
- **Mixins:** `button-primary`, `button-ghost`, `input-pill`, `card`,
  `chip($bg, $ink)`, `focus-ring`.
- **Breakpoints:** mobile-first; `$bp-md: 768px`, `$bp-lg: 1080px`.

## Section 2 — Signature components (`client/src/components/Orbit/`)

- **`Radar.tsx`** — the one reusable signature component. Props:
  `size` (px), `sweep` (boolean, default true), `children` (center slot).
  Renders 3 concentric rings + optional rotating sweep + centered child.
  Floating dots are positioned by the consuming page (CSS class below),
  keeping Radar dumb and reusable. A `Radar.scss` holds ring/sweep/pulse
  keyframes, all wrapped in `@media (prefers-reduced-motion: no-preference)`.
- **CSS utilities** (in `Radar.scss`): `.orbit-dot` (pulsing dot,
  staggered via `animation-delay` inline style), `.orbit-halo`
  (avatar double-ring box-shadow: `0 0 0 3px #fff, 0 0 0 5px
  rgba(99,102,241,.35)`; amber variant).
- **Usage map:** Home hero (large, sweep, emoji dots) → BuddySearch/Places
  empty-and-loading states (small "scanning" radar with copy) → Messages
  unread indicator (single pulsing dot). The 404 page uses a static radar
  ("off the radar").
- **Logo mark:** CSS-only in the navbar — 18px indigo ring with a 6px
  amber dot on its edge + wordmark "SportsMatch" (800 weight). The site
  favicon becomes a matching inline SVG (ring + dot).

## Section 3 — App shell & shared components

- **NavBar** (own component, no react-bootstrap): sticky, ivory with
  bottom hairline, logo left. Two variants by auth/route: public
  (`/home`, `/login`, `/register`, logged out): logo + "Log in" link +
  "Join free" pill; app (authenticated): centered pill links (active =
  `#EEF2FF` bg + `#4F46E5` text via NavLink), avatar chip (photo or
  initial, orbit halo) with Logout (existing ConfirmModal flow). Mobile:
  hamburger toggling a slide-down panel — own state, no Bootstrap JS.
- **CustomAlert** rewritten without react-bootstrap: rounded card,
  `danger` = danger-soft bg / danger text; `success` = accent-soft /
  deep. Same `{ variant, message }` props — call sites unchanged.
- **ConfirmModal / sweetalert2:** `sweetalert2-custom.scss` restyled to
  tokens (surface, pill buttons, Manrope).
- **404:** "Off the radar" — static Radar, headline, "Back home" pill.
  `errorPage.gif` deleted.
- **Bootstrap removal:** after NavBar, CustomAlert, Home, Login/Register
  are rewritten, `bootstrap` and `react-bootstrap` are uninstalled and
  the `@import 'bootstrap/scss/bootstrap'` in `App.scss` deleted.

## Section 4 — Pages

All pages: max-width container (1080px), ivory bg, mobile-first.

1. **Home:** marketing hero — amber badge ("SOFIA · 40 SPORTS"),
   display headline ("Never play alone again"), subcopy, CTAs ("Find a
   partner" → /buddySearch, "Browse venues" → /places; both route via
   RequireAuth → login when logged out), animated Radar right (sport
   emoji dots), then three feature cards (Find buddies / Chat live /
   Meet nearby). Background video and HomeCard images retired.
2. **Login / Register:** centered surface card (max 420px), logo mark,
   labeled pill inputs with the existing shared-schema field errors shown
   inline beneath fields, primary pill submit, cross-link to the other
   form. Corner radar decoration (static, subtle).
3. **Profile:** header card — avatar (96px, orbit halo) with the existing
   photo-upload flow, username, city field; activities as a chip grid
   (image thumb + label + ✕ remove, existing confirm-remove flow).
4. **Activities:** heading + debounced search (pill input), responsive
   card grid: image, label, Add/Remove pill button (Add = primary,
   Remove = ghost with danger text on hover); saving guard unchanged.
5. **Buddy Search:** filter bar (sport select + city input as pills,
   result count right), responsive grid of buddy cards (centered avatar
   with halo — indigo/amber alternating, username, sport chips capped
   with "+N" overflow, "Message" primary pill → existing Start Chat
   navigation). Empty state = scanning radar + "No buddies found — try
   another sport or city". Error = CustomAlert.
6. **Messages:** two-pane surface card. Left: conversations (avatar,
   username, unread **pulsing orbit dot**). Right: thread header
   (receiver), bubbles — received: white, `16/16/16/4` radii, card
   shadow; sent: `#4F46E5` white text, `16/16/4/16`; `formatDate`
   timestamps as muted micro-text; input row = pill input + "Send"
   primary pill. Mobile (<768px): panes stack — list first, selecting a
   conversation shows the thread with a "‹ Chats" back control (component
   state, no route change). Empty state: "Go back and find a buddy"
   copy retired in favor of a scanning radar + "Find a buddy to start
   chatting" + link to /buddySearch.
7. **Places:** heading ("Find a place to play in Sofia"), filter bar
   (text pill, sport select pill, **Near me** pill toggle — active state
   accent-soft with dot), venue card grid: image (existing onError
   fallback), name, amber distance badge ("1.2 km") when `distanceKm`
   present, address/phone/hours as muted lines, site link. "No results"
   → scanning radar empty state. All existing fetching/debounce/geo
   logic unchanged.
8. **Copy freedom:** page copy may change as specified above; the
   prototype-parity copy constraints from phases 1–4 are superseded.

## Section 5 — Testing & success criteria

- **All 99 existing tests stay green** — they cover schemas, API
  wrappers, and utilities, not page markup. Any test that asserts
  UI copy that changed gets updated with the page it covers.
- **New client tests:** Radar renders `rings` and center child, and
  omits the sweep element when `sweep={false}`; NavBar shows public
  variant logged out and app variant (with active pill) logged in
  (React Testing Library is already available via existing
  RequireAuth.test.tsx patterns — if not, add `@testing-library/react`
  as devDependency).
- **Build gates:** `npm run build` clean; `bootstrap`/`react-bootstrap`
  absent from `client/package.json` and the bundle.
- **Manual click-through** (dev:memory): every page at 1280px and 375px;
  keyboard-tab shows focus rings; OS reduced-motion setting freezes
  sweep/pulse; chat two-browser flow still works; Near me still sorts.

## Out of scope (deliberate)

- Dark mode / theme toggle; new features or API changes; activity
  PNG replacement with geometric tiles; logo as an asset file (beyond
  the CSS mark + SVG favicon); PWA manifest/service worker; Capacitor
  packaging; marketing pages beyond Home.
