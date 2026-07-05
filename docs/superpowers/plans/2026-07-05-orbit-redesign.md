# Orbit Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ported prototype look with the Orbit design system — light warm base, Manrope, indigo/amber, radar signature — across every page, and remove Bootstrap entirely.

**Architecture:** A token-first restyle: one tokens/mixins/base layer in `client/src/styles/`, one reusable `Radar` signature component, then page-by-page recomposition (markup + page SCSS) that preserves all existing state, handlers, API calls, and tests. Bootstrap/react-bootstrap are removed after their last consumer is rewritten.

**Tech Stack:** React 18 + Vite 7, SCSS (`@import` style, deprecations silenced in vite config), `@fontsource-variable/manrope`, Vitest + @testing-library/react (already installed), sweetalert2 (kept, restyled).

**Spec:** `docs/superpowers/specs/2026-07-05-orbit-redesign-design.md` (baseline `3e445b9`, 99 tests: 29 shared / 56 server / 14 client). Presentation layer ONLY — server and shared workspaces are untouched by this plan.

## Global Constraints

- Presentation only: every page keeps its existing state, hooks, handlers, API calls, validation, and navigation targets. If a step's markup references a handler, bind the file's existing function — do not reimplement logic.
- Exact token values (from the spec): bg `#FAF9F7`; surface `#FFFFFF`; borders `#E7E5E4`/`#EDEAE4`; ink `#1C1917`; ink-soft `#57534E`; muted `#78716C`; faint `#A8A29E`; accent decorative `#6366F1`, interactive `#4F46E5`, deep `#4338CA`, soft `#EEF2FF`; amber `#F59E0B`/`#B45309`/`#FEF3C7`; success `#059669`; danger `#DC2626`/soft `#FEE2E2`; radar rings `rgba(99,102,241,.16/.26/.36)`.
- Shape: cards 18px radius; bubbles 16px (4px tail corner); buttons/inputs/tags pill (999px). Shadows: `0 8px 24px rgba(28,25,23,.07)` (card), `0 12px 32px rgba(28,25,23,.12)` (pop). **No text-shadows anywhere.**
- Primary buttons and links use `#4F46E5` (contrast); `#6366F1` is decorative only (rings, dots, sweep).
- Every animation (sweep, pulse) is defined inside `@media (prefers-reduced-motion: no-preference)`.
- Every interactive element keeps a visible `:focus-visible` ring (2px `#4F46E5`, offset 2px); the global `*:focus { outline: none }` dies in Task 1.
- Mobile-first: pages must be usable at 375px wide; breakpoints `$bp-md: 768px`, `$bp-lg: 1080px`.
- TypeScript strict, zero `any`.
- All 99 existing tests stay green after every task (`npm test` from repo root); client build (`npm run build -w client`) stays clean after every task.
- Old-token quarantine: after Task 9, no file may reference `$almost-white-color`, `$super-contrast`, `$contrast-transperant`, `$purple-color`, `text-shadow`, or `@include gradientBorder` — Task 9 greps for them.
- react-bootstrap consumers (NavBar, CustomAlert, Home, LoginForm, RegistrationForm) must be rewritten before Task 4 uninstalls `bootstrap` + `react-bootstrap`.

## File Structure

| Unit | Files | Responsibility |
|---|---|---|
| Tokens layer | `client/src/styles/_tokens.scss`, `_mixins.scss`, `_base.scss`; slim `client/src/index.scss` | Single source of visual truth |
| Signature | `client/src/components/Orbit/Radar.tsx` + `Radar.scss` (+ `.orbit-dot`, `.orbit-halo` utilities) | The one reusable radar |
| Shell | `NavBar.tsx/.scss`, `CustomAlert.tsx`, `sweetalert2-custom.scss`, `client/index.html`, `client/public/favicon.svg` | App chrome |
| Pages | each `pages/<X>/<X>.tsx` + `.scss`; new `pages/NotFound/NotFound.tsx` | Recomposition |
| Removal | `bootstrap`, `react-bootstrap`, ion-icon script tags, `gradient2.jpg`, `11.mov`, `homePage/` images, `HomeCard/`, `projectBackground3.png`, `errorPage.gif`, old `src/_variables.scss`, old `src/_mixins.scss`, `App.scss` | Retirement |

Old `client/src/_variables.scss`/`_mixins.scss` stay in place until Task 9 (unmigrated pages still import them); new pages import `../../styles/tokens` and `../../styles/mixins` instead.

---

### Task 1: Foundation — tokens, base, Radar, favicon

**Files:**
- Create: `client/src/styles/_tokens.scss`, `client/src/styles/_mixins.scss`, `client/src/styles/_base.scss`
- Create: `client/src/components/Orbit/Radar.tsx`, `client/src/components/Orbit/Radar.scss`, `client/src/components/Orbit/Radar.test.tsx`
- Create: `client/public/favicon.svg`
- Modify: `client/src/index.scss` (full replace), `client/src/main.tsx` (font import), `client/index.html` (favicon + theme-color)
- Delete: `client/src/images/gradient2.jpg`

**Interfaces:**
- Consumes: nothing new.
- Produces: SCSS partials `client/src/styles/_tokens.scss` and `_mixins.scss` (mixins: `card`, `button-primary`, `button-ghost`, `input-pill`, `chip($bg, $ink)`, `focus-ring`, `page-container`) imported by every later task as `@import "../../styles/tokens"; @import "../../styles/mixins";` — plus `Radar` (props `{ size: number; sweep?: boolean; children?: ReactNode }`) and CSS utilities `.orbit-dot`, `.orbit-halo`, `.orbit-halo--amber`.

- [ ] **Step 1: Install the font**

Run from repo root: `npm install @fontsource-variable/manrope -w client`
Expected: added to `client/package.json` dependencies.

- [ ] **Step 2: Write the failing Radar test**

Create `client/src/components/Orbit/Radar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Radar from "./Radar";

describe("Radar", () => {
  it("renders three rings, the sweep, and the center content", () => {
    const { container } = render(<Radar size={120}>ME</Radar>);
    expect(container.querySelectorAll(".orbitRadar__ring")).toHaveLength(3);
    expect(container.querySelector(".orbitRadar__sweep")).not.toBeNull();
    expect(screen.getByText("ME")).toBeTruthy();
  });

  it("omits the sweep when sweep is false", () => {
    const { container } = render(<Radar size={80} sweep={false} />);
    expect(container.querySelector(".orbitRadar__sweep")).toBeNull();
    expect(container.querySelector(".orbitRadar__center")).toBeNull();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test -w client -- src/components/Orbit/Radar.test.tsx`
Expected: FAIL — cannot resolve `./Radar`.

- [ ] **Step 4: Write the tokens partial**

Create `client/src/styles/_tokens.scss`:

```scss
// Orbit design tokens — the single source of visual truth (see
// docs/superpowers/specs/2026-07-05-orbit-redesign-design.md).

// Surfaces
$bg: #faf9f7;
$surface: #ffffff;
$border: #e7e5e4;
$border-soft: #edeae4;

// Ink
$ink: #1c1917;
$ink-soft: #57534e;
$muted: #78716c;
$faint: #a8a29e;

// Accent — indigo. $accent is decorative (rings, dots, sweep);
// $accent-strong is the interactive color (buttons, links) for contrast.
$accent: #6366f1;
$accent-strong: #4f46e5;
$accent-deep: #4338ca;
$accent-soft: #eef2ff;

// Secondary — amber
$amber: #f59e0b;
$amber-deep: #b45309;
$amber-soft: #fef3c7;

// Status
$success: #059669;
$danger: #dc2626;
$danger-soft: #fee2e2;

// Radar
$ring-1: rgba(99, 102, 241, 0.16);
$ring-2: rgba(99, 102, 241, 0.26);
$ring-3: rgba(99, 102, 241, 0.36);

// Shape & elevation
$radius-card: 18px;
$radius-bubble: 16px;
$radius-pill: 999px;
$shadow-card: 0 8px 24px rgba(28, 25, 23, 0.07);
$shadow-pop: 0 12px 32px rgba(28, 25, 23, 0.12);

// Type & layout
$font: "Manrope Variable", system-ui, -apple-system, "Segoe UI", sans-serif;
$bp-md: 768px;
$bp-lg: 1080px;
```

- [ ] **Step 5: Write the mixins partial**

Create `client/src/styles/_mixins.scss`:

```scss
@import "./tokens";

@mixin focus-ring {
    &:focus-visible {
        outline: 2px solid $accent-strong;
        outline-offset: 2px;
    }
}

@mixin card {
    background: $surface;
    border-radius: $radius-card;
    box-shadow: $shadow-card;
}

@mixin button-base {
    font-family: $font;
    font-weight: 700;
    font-size: 15px;
    border-radius: $radius-pill;
    padding: 12px 24px;
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
    @include focus-ring;

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
}

@mixin button-primary {
    @include button-base;
    background: $accent-strong;
    color: #fff;
    border: none;

    &:hover:not(:disabled) {
        background: $accent-deep;
    }
}

@mixin button-ghost {
    @include button-base;
    background: $surface;
    color: $ink;
    border: 1.5px solid $border;

    &:hover:not(:disabled) {
        border-color: $ink;
    }
}

@mixin input-pill {
    font-family: $font;
    font-size: 15px;
    color: $ink;
    background: $surface;
    border: 1.5px solid $border;
    border-radius: $radius-pill;
    padding: 12px 20px;
    @include focus-ring;

    &::placeholder {
        color: $faint;
    }
}

@mixin chip($chip-bg, $chip-ink) {
    display: inline-block;
    background: $chip-bg;
    color: $chip-ink;
    font-weight: 700;
    font-size: 12px;
    border-radius: $radius-pill;
    padding: 4px 12px;
}

@mixin page-container {
    max-width: $bp-lg;
    margin: 0 auto;
    padding: 32px 20px 64px;
}
```

- [ ] **Step 6: Write the base partial and slim index.scss**

Create `client/src/styles/_base.scss`:

```scss
@import "./tokens";

* {
    box-sizing: border-box;
}

body {
    margin: 0;
    font-family: $font;
    font-size: 16px;
    background: $bg;
    color: $ink;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

h1,
h2,
h3,
h4 {
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0;
}

p {
    margin: 0;
}

a {
    color: $accent-strong;
}

// Focus is visible everywhere; the old global outline:none is gone.
:focus-visible {
    outline: 2px solid $accent-strong;
    outline-offset: 2px;
}

code {
    font-family: source-code-pro, Menlo, Monaco, Consolas, "Courier New", monospace;
}

::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

::-webkit-scrollbar-track {
    background-color: transparent;
}

::-webkit-scrollbar-thumb {
    background-color: $border;
    border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
    background-color: $faint;
}
```

Replace the ENTIRE content of `client/src/index.scss` with:

```scss
@import "./styles/base";
```

Then delete the retired background asset:

```bash
git rm client/src/images/gradient2.jpg
```

(`#background-video` styles die with the old index.scss; the video element itself is removed in Task 3.)

- [ ] **Step 7: Write the Radar component and its styles**

Create `client/src/components/Orbit/Radar.tsx`:

```tsx
import type { ReactNode } from "react";
import "./Radar.scss";

interface RadarProps {
  size: number;
  sweep?: boolean;
  children?: ReactNode;
}

/**
 * The Orbit signature: three concentric rings with an optional rotating
 * sweep and a centered slot. Floating dots are positioned by the consuming
 * page with the .orbit-dot utility; this component stays dumb.
 */
export default function Radar({ size, sweep = true, children }: RadarProps) {
  return (
    <div className="orbitRadar" style={{ width: size, height: size }}>
      <span className="orbitRadar__ring orbitRadar__ring--outer" aria-hidden="true" />
      <span className="orbitRadar__ring orbitRadar__ring--mid" aria-hidden="true" />
      <span className="orbitRadar__ring orbitRadar__ring--inner" aria-hidden="true" />
      {sweep && <span className="orbitRadar__sweep" aria-hidden="true" />}
      {children !== undefined && children !== null && <span className="orbitRadar__center">{children}</span>}
    </div>
  );
}
```

Create `client/src/components/Orbit/Radar.scss`:

```scss
@import "../../styles/tokens";

.orbitRadar {
    position: relative;
    flex-shrink: 0;

    &__ring {
        position: absolute;
        border-radius: 50%;
        pointer-events: none;

        &--outer {
            inset: 0;
            border: 1.5px solid $ring-1;
        }

        &--mid {
            inset: 14%;
            border: 1.5px solid $ring-2;
        }

        &--inner {
            inset: 28%;
            border: 1.5px solid $ring-3;
        }
    }

    &__sweep {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: conic-gradient(from 0deg, rgba(99, 102, 241, 0.18), transparent 65deg);
        pointer-events: none;
    }

    &__center {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: center;
    }
}

// Floating "player" dot — pages position it absolutely inside a relative box.
.orbit-dot {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: $surface;
    box-shadow: 0 5px 14px rgba(28, 25, 23, 0.13);
}

// Avatar halo — the double ring around avatars.
.orbit-halo {
    box-shadow: 0 0 0 3px $surface, 0 0 0 5px rgba(99, 102, 241, 0.35);
}

.orbit-halo--amber {
    box-shadow: 0 0 0 3px $surface, 0 0 0 5px rgba(245, 158, 11, 0.35);
}

@media (prefers-reduced-motion: no-preference) {
    .orbitRadar__sweep {
        animation: orbit-sweep 7s linear infinite;
    }

    .orbit-dot {
        animation: orbit-pulse 3.2s ease-in-out infinite;
    }

    @keyframes orbit-sweep {
        from {
            transform: rotate(0deg);
        }

        to {
            transform: rotate(360deg);
        }
    }

    @keyframes orbit-pulse {
        0%,
        100% {
            transform: scale(1);
            opacity: 1;
        }

        50% {
            transform: scale(1.3);
            opacity: 0.55;
        }
    }
}
```

- [ ] **Step 8: Font import, favicon, theme color**

In `client/src/main.tsx`, add as the FIRST import line:

```typescript
import "@fontsource-variable/manrope";
```

Create `client/public/favicon.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="11" fill="none" stroke="#6366F1" stroke-width="3.5"/>
  <circle cx="25" cy="7" r="4.5" fill="#F59E0B"/>
</svg>
```

In `client/index.html`: replace `<link rel="icon" href="/favicon.ico" />` with `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`, and change `<meta name="theme-color" content="#000000" />` to `<meta name="theme-color" content="#FAF9F7" />`. Delete `client/public/favicon.ico` if it exists (check with `ls client/public`).

- [ ] **Step 9: Run tests and build**

Run: `npm test -w client` — expected: 16 passing (14 existing + 2 Radar).
Run: `npm run build -w client` — expected: clean. (Bootstrap is still installed and still imported by App.scss — untouched in this task.)
Note: the app now shows the new base (ivory bg, Manrope, dark text) under the OLD page styles — pages will look partially broken until their tasks land. That is expected mid-migration state; do not "fix" pages here.

- [ ] **Step 10: Commit**

```bash
git add -A client
git commit -m "feat(client): Orbit foundation — tokens, base styles, Radar signature, favicon"
```

---

### Task 2: App shell — NavBar, CustomAlert, sweetalert2

**Files:**
- Modify: `client/src/components/NavBar/NavBar.tsx` (full replace), `client/src/components/NavBar/NavBar.scss` (full replace)
- Create: `client/src/components/NavBar/NavBar.test.tsx`
- Modify: `client/src/components/CustomAlert/CustomAlert.tsx` (full replace)
- Create: `client/src/components/CustomAlert/CustomAlert.scss`
- Modify: `client/src/sweetalert2-custom.scss` (full replace)

**Interfaces:**
- Consumes: `useAuth()` → `{ user, logout }` (user has `username`, `image`); `ConfirmModal(title, text)` → `Promise<boolean>` (unchanged); Task 1 tokens/mixins.
- Produces: `<NavBar />` (same default export, still rendered once in App.tsx — no App.tsx change needed); `<CustomAlert variant message />` with the SAME props type (`"success" | "danger" | "warning" | "info"`) so no call site changes.

- [ ] **Step 1: Write the failing NavBar test**

Create `client/src/components/NavBar/NavBar.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../context/AuthContext";
import NavBar from "./NavBar";

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderAt(path: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <NavBar />
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe("NavBar", () => {
  it("shows the public variant to anonymous visitors on /home", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "no" } }), { status: 401 })),
    );
    renderAt("/home");
    await waitFor(() => expect(screen.getByText("Join free")).toBeTruthy());
    expect(screen.queryByText("Buddies")).toBeNull();
  });

  it("shows the app variant with links and avatar initial when logged in", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ user: { username: "andrei", city: "", image: "", activities: [] } }), { status: 200 }),
      ),
    );
    renderAt("/buddySearch");
    await waitFor(() => expect(screen.getByText("Buddies")).toBeTruthy());
    expect(screen.getByText("A")).toBeTruthy(); // avatar initial
    expect(screen.queryByText("Join free")).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -w client -- src/components/NavBar/NavBar.test.tsx`
Expected: FAIL (current NavBar renders the react-bootstrap dark bar; "Join free" not found).

- [ ] **Step 3: Rewrite NavBar**

Replace `client/src/components/NavBar/NavBar.tsx` entirely with:

```tsx
import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ConfirmModal from "../Modals/ConfirmModal";
import "./NavBar.scss";

const APP_LINKS = [
  { to: "/home", label: "Home" },
  { to: "/profile", label: "Profile" },
  { to: "/activities", label: "Activities" },
  { to: "/buddySearch", label: "Buddies" },
  { to: "/messages", label: "Messages" },
  { to: "/places", label: "Places" },
];

export default function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const publicRoute = ["/home", "/login", "/register", "/"].includes(location.pathname);
  const publicVariant = !user && publicRoute;

  const handleLogout = async () => {
    const isConfirmed = await ConfirmModal("Logout", "Are you sure you want to logout?");
    if (isConfirmed) {
      setMenuOpen(false);
      await logout();
      navigate("/login");
    }
  };

  return (
    <header className="orbitNav">
      <div className="orbitNav__inner">
        <Link to="/home" className="orbitNav__logo" onClick={() => setMenuOpen(false)}>
          <span className="orbitNav__mark" aria-hidden="true" />
          SportsMatch
        </Link>

        {publicVariant ? (
          <nav className="orbitNav__public">
            <Link className="orbitNav__loginLink" to="/login">Log in</Link>
            <Link className="orbitNav__cta" to="/register">Join free</Link>
          </nav>
        ) : (
          <>
            <button
              type="button"
              className="orbitNav__burger"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </button>
            <nav className={menuOpen ? "orbitNav__links orbitNav__links--open" : "orbitNav__links"}>
              {APP_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) => (isActive ? "orbitNav__link orbitNav__link--active" : "orbitNav__link")}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </NavLink>
              ))}
              {user ? (
                <button type="button" className="orbitNav__logout" onClick={handleLogout}>
                  Logout
                </button>
              ) : (
                <NavLink to="/login" className="orbitNav__link" onClick={() => setMenuOpen(false)}>
                  Login
                </NavLink>
              )}
            </nav>
            {user && (
              <span className="orbitNav__avatar orbit-halo" title={user.username}>
                {user.image ? <img src={user.image} alt={user.username} /> : user.username.charAt(0).toUpperCase()}
              </span>
            )}
          </>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Write NavBar.scss**

Replace `client/src/components/NavBar/NavBar.scss` entirely with:

```scss
@import "../../styles/tokens";
@import "../../styles/mixins";

.orbitNav {
    position: sticky;
    top: 0;
    z-index: 20;
    background: rgba(250, 249, 247, 0.92);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid $border-soft;

    &__inner {
        max-width: $bp-lg;
        margin: 0 auto;
        padding: 12px 20px;
        display: flex;
        align-items: center;
        gap: 16px;
    }

    &__logo {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 800;
        font-size: 17px;
        letter-spacing: -0.02em;
        color: $ink;
        text-decoration: none;
        margin-right: auto;
        @include focus-ring;
    }

    &__mark {
        width: 18px;
        height: 18px;
        border: 2.5px solid $accent;
        border-radius: 50%;
        position: relative;

        &::after {
            content: "";
            position: absolute;
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: $amber;
            top: -3px;
            right: -4px;
        }
    }

    &__public {
        display: flex;
        align-items: center;
        gap: 16px;
    }

    &__loginLink {
        color: $ink;
        font-weight: 700;
        font-size: 14px;
        text-decoration: none;
        @include focus-ring;
    }

    &__cta {
        @include button-primary;
        padding: 9px 18px;
        font-size: 14px;
        text-decoration: none;
    }

    &__links {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    &__link {
        color: $muted;
        font-weight: 700;
        font-size: 14px;
        text-decoration: none;
        padding: 7px 14px;
        border-radius: $radius-pill;
        @include focus-ring;

        &--active {
            color: $accent-strong;
            background: $accent-soft;
        }
    }

    &__logout {
        @include button-ghost;
        padding: 7px 14px;
        font-size: 14px;
    }

    &__avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: $accent-soft;
        color: $accent-strong;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 13px;
        overflow: hidden;
        flex-shrink: 0;

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    }

    &__burger {
        display: none;
        flex-direction: column;
        gap: 4px;
        background: none;
        border: none;
        padding: 8px;
        cursor: pointer;
        @include focus-ring;

        span {
            width: 20px;
            height: 2.5px;
            border-radius: 2px;
            background: $ink;
        }
    }

    @media (max-width: #{$bp-md - 1px}) {
        &__burger {
            display: flex;
        }

        &__links {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            flex-direction: column;
            align-items: stretch;
            background: $bg;
            border-bottom: 1px solid $border-soft;
            padding: 8px 20px 16px;
            box-shadow: $shadow-pop;

            &--open {
                display: flex;
            }
        }

        &__link,
        &__logout {
            text-align: center;
        }
    }
}
```

- [ ] **Step 5: Rewrite CustomAlert**

Replace `client/src/components/CustomAlert/CustomAlert.tsx` entirely with:

```tsx
import "./CustomAlert.scss";

interface CustomAlertProps {
  variant: "success" | "danger" | "warning" | "info";
  message: string;
}

export default function CustomAlert({ variant, message }: CustomAlertProps) {
  return (
    <div className={`orbitAlert orbitAlert--${variant}`} role="alert">
      {message}
    </div>
  );
}
```

Create `client/src/components/CustomAlert/CustomAlert.scss`:

```scss
@import "../../styles/tokens";

.orbitAlert {
    border-radius: $radius-card;
    padding: 12px 18px;
    font-weight: 700;
    font-size: 14px;
    margin: 12px 0;

    &--danger {
        background: $danger-soft;
        color: $danger;
    }

    &--success {
        background: $accent-soft;
        color: $accent-deep;
    }

    &--warning,
    &--info {
        background: $amber-soft;
        color: $amber-deep;
    }
}
```

- [ ] **Step 6: Restyle sweetalert2**

Replace `client/src/sweetalert2-custom.scss` entirely with:

```scss
@import "./styles/tokens";

.swal2-popup {
    font-family: $font !important;
    background: $surface !important;
    color: $ink !important;
    border-radius: $radius-card !important;
    box-shadow: $shadow-pop !important;
}

.swal2-title {
    color: $ink !important;
    font-weight: 800 !important;
    letter-spacing: -0.02em !important;
}

.swal2-html-container {
    color: $muted !important;
}

.swal2-confirm {
    background: $accent-strong !important;
    border-radius: $radius-pill !important;
    font-weight: 700 !important;
    padding: 10px 24px !important;
    box-shadow: none !important;
}

.swal2-cancel {
    background: $surface !important;
    color: $ink !important;
    border: 1.5px solid $border !important;
    border-radius: $radius-pill !important;
    font-weight: 700 !important;
    padding: 10px 24px !important;
}
```

(Keep whatever import wiring already loads `sweetalert2-custom.scss` — check with `grep -rn "sweetalert2-custom" client/src` and leave those import lines as they are.)

- [ ] **Step 7: Run tests and build**

Run: `npm test -w client` — expected 18 passing (16 + 2 NavBar).
Run: `npm run build -w client` — expected clean (react-bootstrap still installed; Home/Login still use it).

- [ ] **Step 8: Commit**

```bash
git add -A client
git commit -m "feat(client): Orbit app shell — NavBar variants, CustomAlert, sweetalert2 restyle"
```

---

### Task 3: Home page

**Files:**
- Modify: `client/src/pages/Home/Home.tsx` (full replace), `client/src/pages/Home/Home.scss` (full replace)
- Delete: `client/src/components/HomeCard/` (both files), `client/src/images/homePage/` (entire folder), `client/src/images/11.mov`

**Interfaces:**
- Consumes: `Radar` (Task 1), tokens/mixins.
- Produces: nothing downstream.

- [ ] **Step 1: Rewrite Home.tsx**

Replace `client/src/pages/Home/Home.tsx` entirely with:

```tsx
import { Link } from "react-router-dom";
import Radar from "../../components/Orbit/Radar";
import "./Home.scss";

const FEATURES = [
  { icon: "👥", title: "Find buddies", text: "By sport and city, instantly" },
  { icon: "💬", title: "Chat live", text: "Arrange the game in-app" },
  { icon: "📍", title: "Meet nearby", text: "54 venues, sorted by distance" },
];

const HERO_DOTS = [
  { emoji: "🎾", style: { left: "12%", top: "20%", animationDelay: "0s" } },
  { emoji: "🏀", style: { right: "6%", top: "34%", animationDelay: "1.1s" } },
  { emoji: "🏸", style: { left: "24%", bottom: "8%", animationDelay: "2.2s" } },
];

export default function HomePage() {
  return (
    <div className="homePage">
      <section className="homePage__hero">
        <div className="homePage__intro">
          <span className="homePage__badge">SOFIA · 40 SPORTS</span>
          <h1 className="homePage__title">
            Never play
            <br />
            alone again
          </h1>
          <p className="homePage__subtitle">
            Find people who play your sport, chat, and meet at a venue near you.
          </p>
          <div className="homePage__actions">
            <Link className="homePage__primaryCta" to="/buddySearch">
              Find a partner
            </Link>
            <Link className="homePage__ghostCta" to="/places">
              Browse venues
            </Link>
          </div>
        </div>
        <div className="homePage__radarWrap">
          <Radar size={280}>
            <span className="homePage__you">A</span>
          </Radar>
          {HERO_DOTS.map((dot) => (
            <span key={dot.emoji} className="orbit-dot homePage__dot" style={dot.style}>
              {dot.emoji}
            </span>
          ))}
        </div>
      </section>

      <section className="homePage__features">
        {FEATURES.map((feature) => (
          <article key={feature.title} className="homePage__feature">
            <span className="homePage__featureIcon" aria-hidden="true">
              {feature.icon}
            </span>
            <h3 className="homePage__featureTitle">{feature.title}</h3>
            <p className="homePage__featureText">{feature.text}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite Home.scss**

Replace `client/src/pages/Home/Home.scss` entirely with:

```scss
@import "../../styles/tokens";
@import "../../styles/mixins";

.homePage {
    @include page-container;

    &__hero {
        display: flex;
        align-items: center;
        gap: 32px;
        padding: 40px 0 48px;
    }

    &__intro {
        flex: 1.2;
    }

    &__badge {
        @include chip($amber-soft, $amber-deep);
        letter-spacing: 0.1em;
        font-size: 11px;
        padding: 6px 14px;
    }

    &__title {
        font-size: clamp(38px, 6vw, 56px);
        line-height: 1.03;
        margin-top: 18px;
    }

    &__subtitle {
        color: $muted;
        font-size: 17px;
        line-height: 1.55;
        margin-top: 14px;
        max-width: 420px;
    }

    &__actions {
        display: flex;
        gap: 12px;
        margin-top: 26px;
        flex-wrap: wrap;
    }

    &__primaryCta {
        @include button-primary;
        text-decoration: none;
    }

    &__ghostCta {
        @include button-ghost;
        text-decoration: none;
    }

    &__radarWrap {
        flex: 1;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 300px;
    }

    &__you {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: $accent;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 16px;
        box-shadow: 0 0 0 5px $bg, 0 0 0 7px rgba(99, 102, 241, 0.3);
    }

    &__dot {
        width: 34px;
        height: 34px;
        font-size: 15px;
    }

    &__features {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
    }

    &__feature {
        @include card;
        padding: 20px 22px;
    }

    &__featureIcon {
        font-size: 24px;
    }

    &__featureTitle {
        font-size: 16px;
        margin-top: 10px;
    }

    &__featureText {
        color: $muted;
        font-size: 13.5px;
        margin-top: 5px;
    }

    @media (max-width: #{$bp-md - 1px}) {
        &__hero {
            flex-direction: column-reverse;
            padding-top: 12px;
            text-align: center;
        }

        &__actions {
            justify-content: center;
        }

        &__subtitle {
            margin-left: auto;
            margin-right: auto;
        }

        &__features {
            grid-template-columns: 1fr;
        }
    }
}
```

- [ ] **Step 3: Delete retired Home assets**

```bash
git rm -r client/src/components/HomeCard client/src/images/homePage client/src/images/11.mov
```

Then `grep -rn "HomeCard\|homePage/\|11.mov" client/src` — expected: no hits outside Home.scss class names (`homePage__…` selectors are fine; import paths must be gone).

- [ ] **Step 4: Tests and build**

Run: `npm test -w client` (18 passing) and `npm run build -w client` (clean — react-bootstrap imports are gone from Home but the packages are still installed until Task 4).

- [ ] **Step 5: Commit**

```bash
git add -A client
git commit -m "feat(client): Orbit home page — hero radar, feature cards; retire video background"
```

---

### Task 4: Login/Register + Bootstrap removal

**Files:**
- Modify: `client/src/pages/LoginAndRegister/LoginForm.tsx` (full replace), `client/src/pages/LoginAndRegister/RegistrationForm.tsx` (markup + event types only), `client/src/pages/LoginAndRegister/LoginAndRegister.scss` (full replace)
- Modify: `client/index.html` (remove ion-icon scripts), `client/src/App.tsx` (remove App.scss import), `client/package.json` (uninstall)
- Delete: `client/src/App.scss`, `client/src/images/projectBackground3.png` (verify unreferenced first)

**Interfaces:**
- Consumes: `useAuth()` → `{ login, register }`; `CustomAlert` (Task 2); shared `registerInputSchema` field validation ALREADY in RegistrationForm — preserved as-is.
- Produces: the LAST react-bootstrap consumers die here; Bootstrap is uninstalled.

- [ ] **Step 1: Rewrite LoginForm.tsx**

Replace `client/src/pages/LoginAndRegister/LoginForm.tsx` entirely with (logic identical to current file — only markup and the event type change):

```tsx
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import Radar from "../../components/Orbit/Radar";
import { useAuth } from "../../context/AuthContext";
import "./LoginAndRegister.scss";

interface AlertState {
  show: boolean;
  variant: "success" | "danger";
  message: string;
}

function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [alert, setAlert] = useState<AlertState>({ show: false, variant: "success", message: "" });

  const from = (location.state as { from?: string } | null)?.from ?? "/home";
  const formValid = username !== "" && password !== "";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "username") {
      setUsername(value.trim());
    } else if (name === "password") {
      setPassword(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) {
      return;
    }
    try {
      await login({ username, password });
      setAlert({ show: true, variant: "success", message: "Login successful!" });
      setTimeout(() => {
        navigate(from);
      }, 1000);
    } catch {
      setAlert({ show: true, variant: "danger", message: "Invalid username or password." });
    }
  };

  return (
    <div className="authPage">
      <div className="authPage__decor" aria-hidden="true">
        <Radar size={220} sweep={false} />
      </div>
      <form className="authCard" onSubmit={handleSubmit}>
        <span className="authCard__mark" aria-hidden="true" />
        <h1 className="authCard__title">Welcome back</h1>
        <p className="authCard__subtitle">Log in to find your next game</p>
        {alert.show && <CustomAlert variant={alert.variant} message={alert.message} />}
        <label className="authCard__label" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          className="authCard__input"
          type="text"
          name="username"
          value={username}
          onChange={handleChange}
          autoComplete="username"
          required
        />
        <label className="authCard__label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          className="authCard__input"
          type="password"
          name="password"
          value={password}
          onChange={handleChange}
          autoComplete="current-password"
          required
        />
        <button type="submit" className="authCard__submit" disabled={!formValid}>
          Log in
        </button>
        <p className="authCard__switch">
          Don&apos;t have an account? <Link to="/register">Sign up</Link>
        </p>
      </form>
    </div>
  );
}

export default LoginForm;
```

- [ ] **Step 2: Restyle RegistrationForm.tsx (markup only)**

In `client/src/pages/LoginAndRegister/RegistrationForm.tsx`, KEEP every hook, the `FieldErrors` state, `firstIssue`, the per-field shared-schema validation in `handleChange`, `formValid`, and `handleSubmit` exactly as they are. Change ONLY:

1. Delete the react-bootstrap import line (`Button`, `Form`) and the `// react-bootstrap's Form.Control types onChange…` comment; change `handleChange`'s parameter type to `React.ChangeEvent<HTMLInputElement>`.
2. Add imports: `Radar` from `../../components/Orbit/Radar` (CustomAlert import already exists).
3. Replace the returned JSX with the same `authPage`/`authCard` structure as LoginForm, with three fields. Field pattern (repeat for `username`, `password`, `confirmPassword`, binding the EXISTING state values and errors):

```tsx
  return (
    <div className="authPage">
      <div className="authPage__decor" aria-hidden="true">
        <Radar size={220} sweep={false} />
      </div>
      <form className="authCard" onSubmit={handleSubmit}>
        <span className="authCard__mark" aria-hidden="true" />
        <h1 className="authCard__title">Join the club</h1>
        <p className="authCard__subtitle">Create your free account</p>
        {alert.show && <CustomAlert variant={alert.variant} message={alert.message} />}
        <label className="authCard__label" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          className={errors.username ? "authCard__input authCard__input--invalid" : "authCard__input"}
          type="text"
          name="username"
          value={username}
          onChange={handleChange}
          autoComplete="username"
          required
        />
        {errors.username && <p className="authCard__error">{errors.username}</p>}
        {/* password field: same pattern, type="password", autoComplete="new-password", errors.password */}
        {/* confirmPassword field: same pattern, label "Confirm password", errors.confirmPassword */}
        <button type="submit" className="authCard__submit" disabled={!formValid}>
          Sign up
        </button>
        <p className="authCard__switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
```

Write the two commented fields out in full (they are the same seven lines as the username field with the names/labels/autocomplete swapped) — no comments in the committed file. Keep the success/alert flow exactly as the file has it today.

- [ ] **Step 3: Rewrite LoginAndRegister.scss**

Replace `client/src/pages/LoginAndRegister/LoginAndRegister.scss` entirely with:

```scss
@import "../../styles/tokens";
@import "../../styles/mixins";

.authPage {
    min-height: calc(100vh - 57px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    position: relative;
    overflow: hidden;

    &__decor {
        position: absolute;
        right: -70px;
        top: -70px;
        opacity: 0.6;
        pointer-events: none;
    }
}

.authCard {
    @include card;
    box-shadow: $shadow-pop;
    width: 100%;
    max-width: 420px;
    padding: 36px 32px;
    display: flex;
    flex-direction: column;
    position: relative;
    z-index: 1;

    &__mark {
        width: 22px;
        height: 22px;
        border: 3px solid $accent;
        border-radius: 50%;
        position: relative;
        margin-bottom: 18px;

        &::after {
            content: "";
            position: absolute;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: $amber;
            top: -4px;
            right: -5px;
        }
    }

    &__title {
        font-size: 26px;
    }

    &__subtitle {
        color: $muted;
        font-size: 14px;
        margin-top: 6px;
        margin-bottom: 10px;
    }

    &__label {
        font-weight: 700;
        font-size: 13px;
        margin: 14px 0 6px;
    }

    &__input {
        @include input-pill;

        &--invalid {
            border-color: $danger;
        }
    }

    &__error {
        color: $danger;
        font-size: 12.5px;
        font-weight: 600;
        margin-top: 6px;
    }

    &__submit {
        @include button-primary;
        margin-top: 22px;
    }

    &__switch {
        color: $muted;
        font-size: 13.5px;
        text-align: center;
        margin-top: 16px;

        a {
            font-weight: 700;
        }
    }
}
```

- [ ] **Step 4: Remove ion-icons and App.scss**

In `client/index.html`: delete the ion-icon comment line and both `<script … ionicons …>` lines.
In `client/src/App.tsx`: delete the line `import "./App.scss";`.
Then: `git rm client/src/App.scss`
Verify `projectBackground3.png` is now unreferenced: `grep -rn "projectBackground3" client/src client/index.html` — expected no hits; then `git rm client/src/images/projectBackground3.png`.
Also check for remaining `ion-icon` usage: `grep -rn "ion-icon" client/src` — expected no hits (the only consumers were the two auth forms). If a `src/types/ion-icons.d.ts` (or similar JSX declaration for `ion-icon`) exists, `git rm` it too.

- [ ] **Step 5: Uninstall Bootstrap — the point of no return**

First verify no consumer remains: `grep -rn "react-bootstrap\|bootstrap" client/src client/index.html` — expected: no hits.
Then run from repo root: `npm uninstall bootstrap react-bootstrap -w client`

- [ ] **Step 6: Tests and build**

Run: `npm test -w client` (18 passing) and `npm run build -w client` (clean — this proves nothing still imports Bootstrap).

- [ ] **Step 7: Commit**

```bash
git add -A client package-lock.json
git commit -m "feat(client): Orbit auth pages; remove Bootstrap, react-bootstrap and ion-icons"
```

---

### Task 5: Profile page

**Files:**
- Modify: `client/src/pages/Profile/Profile.tsx` (JSX + activity-chip change only), `client/src/pages/Profile/Profile.scss` (full replace)
- Possibly delete: the `ActivityComponentCircle` component file (only if `grep -rn "ActivityComponentCircle" client/src` shows Profile was its last consumer after the rewrite)

**Interfaces:**
- Consumes: tokens/mixins, `.orbit-halo`. Existing Profile logic: photo `<input type="file">` handler (FileReader → functional draft update, >2MB guard), city/draft state + save handler, activity remove flow (ConfirmModal + `updateProfile` with filtered keys, `savingActivities` guard), `activityByKey` catalogue lookup for images. ALL preserved.
- Produces: nothing downstream.

**Binding rule for this task:** keep every hook, effect, guard, and handler in Profile.tsx exactly as-is; replace only the returned JSX, transplanting the existing expressions (state values, handler references, conditional guards) into the new markup. Where the new markup shows `/* existing: X */`, substitute the file's actual expression for X.

- [ ] **Step 1: Replace the returned JSX of Profile.tsx**

New structure (bind existing pieces where marked):

```tsx
  return (
    <div className="profilePage">
      <section className="profileCard">
        <div className="profileCard__header">
          <label className="profileCard__avatarWrap" title="Change photo">
            {/* existing: img with the user/draft image or fallback */}
            <img className="profileCard__avatar orbit-halo" src={/* existing image expression */} alt="Profile" />
            <span className="profileCard__avatarHint">Change</span>
            {/* existing: the file input with its current onChange handler */}
            <input type="file" accept="image/*" onChange={/* existing handler */} hidden />
          </label>
          <div>
            <h1 className="profileCard__name">{/* existing username expression */}</h1>
            <p className="profileCard__meta">{/* existing city or "Add your city" fallback */}</p>
          </div>
        </div>
        <div className="profileCard__fields">
          {/* existing city input + save flow, restyled: */}
          <label className="profileCard__label" htmlFor="city">City</label>
          <div className="profileCard__row">
            <input id="city" className="profileCard__input" /* existing value/onChange bindings */ />
            <button type="button" className="profileCard__save" /* existing save handler + disabled guard */>
              Save
            </button>
          </div>
          {/* keep any existing alert/error rendering, using CustomAlert as today */}
        </div>
      </section>

      <section className="profileCard">
        <h2 className="profileCard__sectionTitle">My sports</h2>
        {/* existing activities array; replace ActivityComponentCircle usage with chips: */}
        <div className="profileChips">
          {/* map over the existing activities exactly as the file does today: */}
          <span className="profileChip" key={/* activity key */}>
            <img className="profileChip__img" src={/* activityByKey(key)?.image as the file resolves it today */} alt="" />
            {/* activity label */}
            <button
              type="button"
              className="profileChip__remove"
              aria-label={/* `Remove ${label}` */}
              onClick={/* existing confirm-remove handler for this key */}
              disabled={/* existing savingActivities-style guard */}
            >
              ✕
            </button>
          </span>
        </div>
        {/* keep the existing empty-state branch if one exists; otherwise when the list is empty render: */}
        <p className="profileCard__empty">No sports yet — add some from the Activities page.</p>
      </section>
    </div>
  );
```

If `ActivityComponentCircle` has no remaining consumers after this change (`grep -rn "ActivityComponentCircle" client/src`), delete its file (and its style block if it lives in a dedicated file).

- [ ] **Step 2: Replace Profile.scss**

```scss
@import "../../styles/tokens";
@import "../../styles/mixins";

.profilePage {
    @include page-container;
    max-width: 720px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.profileCard {
    @include card;
    padding: 26px 28px;

    &__header {
        display: flex;
        align-items: center;
        gap: 20px;
    }

    &__avatarWrap {
        position: relative;
        cursor: pointer;
        border-radius: 50%;
        @include focus-ring;
    }

    &__avatar {
        width: 96px;
        height: 96px;
        border-radius: 50%;
        object-fit: cover;
        display: block;
    }

    &__avatarHint {
        position: absolute;
        inset: auto 0 0 0;
        text-align: center;
        font-size: 11px;
        font-weight: 700;
        color: #fff;
        background: rgba(28, 25, 23, 0.55);
        border-radius: 0 0 48px 48px;
        padding: 4px 0 8px;
        opacity: 0;
        transition: opacity 0.15s ease;
    }

    &__avatarWrap:hover &__avatarHint {
        opacity: 1;
    }

    &__name {
        font-size: 24px;
    }

    &__meta {
        color: $muted;
        font-size: 14px;
        margin-top: 4px;
    }

    &__fields {
        margin-top: 20px;
    }

    &__label {
        font-weight: 700;
        font-size: 13px;
        display: block;
        margin-bottom: 6px;
    }

    &__row {
        display: flex;
        gap: 10px;
    }

    &__input {
        @include input-pill;
        flex: 1;
    }

    &__save {
        @include button-primary;
        padding: 10px 22px;
    }

    &__sectionTitle {
        font-size: 18px;
        margin-bottom: 14px;
    }

    &__empty {
        color: $muted;
        font-size: 14px;
    }
}

.profileChips {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.profileChip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: $accent-soft;
    color: $accent-deep;
    font-weight: 700;
    font-size: 13px;
    border-radius: $radius-pill;
    padding: 6px 10px 6px 6px;

    &__img {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        object-fit: cover;
    }

    &__remove {
        background: none;
        border: none;
        color: $accent-deep;
        font-weight: 800;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: $radius-pill;
        @include focus-ring;

        &:hover:not(:disabled) {
            color: $danger;
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }
}
```

- [ ] **Step 3: Tests, build, commit**

Run `npm test -w client` (18) and `npm run build -w client` (clean), then:

```bash
git add -A client
git commit -m "feat(client): Orbit profile page"
```

---

### Task 6: Activities page

**Files:**
- Modify: `client/src/pages/Activities/Activities.tsx` (JSX only), `client/src/pages/Activities/Activities.scss` (full replace), `client/src/components/Activity/Activity.tsx` (JSX only), `client/src/components/Activity/Activity.scss` (full replace)

**Interfaces:**
- Consumes: tokens/mixins. Existing logic preserved: debounced name search, Add/Remove toggle calling `updateProfile({ activities })`, saving guard, `Activity` component props (keep its exact current props including `disabled`).
- Produces: nothing downstream.

**Binding rule:** same as Task 5 — hooks/handlers untouched, JSX replaced, `/* existing: X */` markers substituted with the file's actual expressions.

- [ ] **Step 1: Replace the Activities page JSX**

```tsx
  return (
    <div className="activitiesPage">
      <header className="activitiesPage__head">
        <h1 className="activitiesPage__title">Activities</h1>
        <p className="activitiesPage__subtitle">Pick the sports you play — they power your buddy matches</p>
        <input
          className="activitiesPage__search"
          type="text"
          placeholder="Search sports"
          /* existing search value/onChange bindings */
        />
      </header>
      <div className="activitiesPage__grid">
        {/* existing filtered map rendering <Activity …/> with its existing props */}
      </div>
    </div>
  );
```

- [ ] **Step 2: Replace the Activity card JSX** (keep props/type and all logic; new markup)

```tsx
  return (
    <article className="activityCard">
      <img className="activityCard__img" src={/* existing image prop */} alt={/* existing label */} />
      <div className="activityCard__body">
        <h3 className="activityCard__label">{/* existing label */}</h3>
        <button
          type="button"
          className={/* existing "is added" condition */ ? "activityCard__btn activityCard__btn--remove" : "activityCard__btn"}
          onClick={/* existing toggle handler */}
          disabled={/* existing disabled prop/guard */}
        >
          {/* existing condition ? "Remove" : "Add" */}
        </button>
      </div>
    </article>
  );
```

- [ ] **Step 3: Replace both SCSS files**

`client/src/pages/Activities/Activities.scss`:

```scss
@import "../../styles/tokens";
@import "../../styles/mixins";

.activitiesPage {
    @include page-container;

    &__head {
        margin-bottom: 22px;
    }

    &__title {
        font-size: 28px;
    }

    &__subtitle {
        color: $muted;
        font-size: 14px;
        margin-top: 6px;
    }

    &__search {
        @include input-pill;
        margin-top: 16px;
        width: 100%;
        max-width: 340px;
    }

    &__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 16px;
    }
}
```

`client/src/components/Activity/Activity.scss`:

```scss
@import "../../styles/tokens";
@import "../../styles/mixins";

.activityCard {
    @include card;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    &__img {
        width: 100%;
        height: 130px;
        object-fit: cover;
        display: block;
    }

    &__body {
        padding: 14px 16px 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    &__label {
        font-size: 15px;
    }

    &__btn {
        @include button-primary;
        padding: 9px 16px;
        font-size: 13.5px;

        &--remove {
            @include button-ghost;
            padding: 9px 16px;
            font-size: 13.5px;

            &:hover:not(:disabled) {
                border-color: $danger;
                color: $danger;
            }
        }
    }
}
```

If ANY other file styles or uses old `.activity…` class names from the previous Activity.scss (check `grep -rn "activityCard\|Activity.scss" client/src` and the old class names the file had), update those references — Profile no longer uses them after Task 5.

- [ ] **Step 4: Tests, build, commit**

`npm test -w client` (18), `npm run build -w client` (clean), then:

```bash
git add -A client
git commit -m "feat(client): Orbit activities page"
```

---

### Task 7: Buddy Search page

**Files:**
- Modify: `client/src/pages/BuddySearch/BuddySearch.tsx` (JSX only), `client/src/pages/BuddySearch/BuddySearch.scss` (full replace), `client/src/components/BuddyCard/BuddyCard.tsx` (JSX only), `client/src/components/BuddyCard/BuddyCard.scss` (full replace)

**Interfaces:**
- Consumes: tokens/mixins, `Radar`, `.orbit-halo`/`.orbit-halo--amber`. Existing logic preserved: debounced city input pre-filled from `user?.city`, activity select from `CLIENT_ACTIVITIES` sorted by label, `usersApi.searchUsers`, cancelled-flag effect, error → CustomAlert, `handleStartChat` navigation; BuddyCard keeps its exact current props (`user`, `defaultImage`, `onStartChat`).
- Produces: nothing downstream.

**Binding rule:** same as Task 5.

- [ ] **Step 1: Replace the BuddySearch page JSX**

```tsx
  return (
    <div className="buddyPage">
      <header className="buddyPage__head">
        <h1 className="buddyPage__title">Find a buddy</h1>
        <p className="buddyPage__subtitle">People who share your sport, in your city</p>
      </header>
      <div className="buddyPage__filters">
        <select className="buddyPage__select" id="activity-select" /* existing value/onChange */>
          <option value="">All sports</option>
          {/* existing sortedActivities map (same option elements as today) */}
        </select>
        <input className="buddyPage__input" type="text" placeholder="City" /* existing value/onChange */ />
        <span className="buddyPage__count">{/* existing buddies.length */} found</span>
      </div>
      {/* existing error && <CustomAlert …/> */}
      <div className="buddyPage__grid">
        {/* existing empty branch becomes: */}
        {/* buddies.length === 0 && !error ? ( */}
        <div className="buddyPage__empty">
          <Radar size={110}>
            <span className="buddyPage__emptyDot" />
          </Radar>
          <p>No buddies found — try another sport or city</p>
        </div>
        {/* ) : existing buddies.map(<BuddyCard …/>) with the existing key/props */}
      </div>
    </div>
  );
```

- [ ] **Step 2: Replace the BuddyCard JSX** (props and handlers untouched)

```tsx
  return (
    <article className="buddyCard">
      <img
        className="buddyCard__avatar orbit-halo"
        src={/* existing image-or-default expression */}
        alt={/* existing username */}
      />
      <h3 className="buddyCard__name">{/* existing username */}</h3>
      <div className="buddyCard__tags">
        {/* map the user's activities to label chips as the file resolves labels today,
            rendering AT MOST 3 chips; if there are more, render one extra chip
            `+N` where N = activities.length - 3 */}
        <span className="buddyCard__tag" key={/* key */}>{/* label */}</span>
      </div>
      <button type="button" className="buddyCard__cta" onClick={/* existing start-chat call */}>
        Message
      </button>
    </article>
  );
```

- [ ] **Step 3: Replace both SCSS files**

`client/src/pages/BuddySearch/BuddySearch.scss`:

```scss
@import "../../styles/tokens";
@import "../../styles/mixins";

.buddyPage {
    @include page-container;

    &__title {
        font-size: 28px;
    }

    &__subtitle {
        color: $muted;
        font-size: 14px;
        margin-top: 6px;
    }

    &__filters {
        display: flex;
        gap: 10px;
        align-items: center;
        margin: 20px 0 22px;
        flex-wrap: wrap;
    }

    &__select,
    &__input {
        @include input-pill;
    }

    &__count {
        margin-left: auto;
        color: $muted;
        font-size: 13px;
        font-weight: 700;
    }

    &__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
        gap: 16px;
    }

    &__empty {
        grid-column: 1 / -1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 18px;
        padding: 48px 0;
        color: $muted;
        font-weight: 700;
    }

    &__emptyDot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: $accent;
    }
}
```

`client/src/components/BuddyCard/BuddyCard.scss`:

```scss
@import "../../styles/tokens";
@import "../../styles/mixins";

.buddyCard {
    @include card;
    padding: 22px 18px 18px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;

    &__avatar {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        object-fit: cover;
    }

    &__name {
        font-size: 16px;
        margin-top: 12px;
    }

    &__tags {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        justify-content: center;
        margin-top: 8px;
        min-height: 22px;
    }

    &__tag {
        @include chip($accent-soft, $accent-deep);
        font-size: 11px;
    }

    &__cta {
        @include button-primary;
        margin-top: 14px;
        width: 100%;
        padding: 10px 16px;
        font-size: 14px;
    }
}
```

- [ ] **Step 4: Tests, build, commit**

`npm test -w client` (18), `npm run build -w client` (clean), then:

```bash
git add -A client
git commit -m "feat(client): Orbit buddy search — filter pills, buddy cards, scanning empty state"
```

---

### Task 8: Messages page (with mobile stacking)

**Files:**
- Modify: `client/src/pages/Messages/Messages.tsx` (JSX + one derived className; NO logic changes), `client/src/pages/Messages/Messages.scss` (full replace)

**Interfaces:**
- Consumes: tokens/mixins, `Radar`. Existing logic preserved VERBATIM: the socket lifetime effect, `message:new` single-append path, `currentReceiverRef`, `markThreadRead` calls with their `.catch` comments, the `.timeout(5000).emit` send path and its ack handling, conversations/thread fetching, `formatDate`. **Do not touch any hook, effect, ref, or handler.**
- Produces: nothing downstream.

**Binding rule:** same as Task 5 — transplant existing expressions into new markup. The unread indicator, active-conversation highlight, and sender/receiver bubble-side conditions must keep the file's exact current logic expressions.

- [ ] **Step 1: Replace the Messages page JSX**

The page keeps its existing receiver-selection state; the ONLY addition is using it for a mobile class. New structure:

```tsx
  return (
    <div className={/* existing receiver truthy? */ ? "chatPage chatPage--thread" : "chatPage"}>
      <aside className="chatPage__list">
        <h2 className="chatPage__listTitle">Chats</h2>
        {/* existing conversations.map — for each conversation: */}
        <button
          type="button"
          key={/* existing key */}
          className={/* existing "is active" condition */ ? "chatItem chatItem--active" : "chatItem"}
          onClick={/* existing select-conversation handler */}
        >
          <img className="chatItem__avatar" src={/* existing conversation image-or-default */} alt="" />
          <span className="chatItem__body">
            <span className="chatItem__name">{/* conversation username */}</span>
          </span>
          {/* existing unread condition */ && <span className="chatItem__unread" aria-label="Unread messages" />}
        </button>
        {/* if the existing code renders an empty-conversations branch, restyle it as: */}
        <div className="chatPage__listEmpty">
          <Radar size={90} />
          <p>Find a buddy to start chatting</p>
          <Link to="/buddySearch">Find buddies</Link>
        </div>
      </aside>

      <section className="chatPage__thread">
        {/* existing "no receiver selected" branch renders the same empty state as above,
            centered in the thread pane (className chatPage__threadEmpty) */}
        {/* when a receiver is selected (existing condition): */}
        <header className="chatPage__header">
          <button
            type="button"
            className="chatPage__back"
            aria-label="Back to chats"
            onClick={/* existing receiver setter with its empty/cleared value */}
          >
            ‹
          </button>
          <h3 className="chatPage__receiver">{/* existing receiver name */}</h3>
        </header>
        <div className="chatPage__messages">
          {/* existing messages.map — for each message keep the existing sent/received condition: */}
          <div key={/* existing key */} className={/* is own message */ ? "bubble bubble--sent" : "bubble bubble--received"}>
            <p className="bubble__text">{/* message text */}</p>
            <span className="bubble__time">{/* existing formatDate call */}</span>
          </div>
        </div>
        <form className="chatPage__composer" /* existing submit handler */>
          <input className="chatPage__input" /* existing value/onChange/placeholder */ />
          <button type="submit" className="chatPage__send">Send ↑</button>
        </form>
      </section>
    </div>
  );
```

Add `import { Link } from "react-router-dom";` and the `Radar` import if not present. If the current file renders auto-scroll anchors, keep them inside `.chatPage__messages` exactly where they are today.

- [ ] **Step 2: Replace Messages.scss**

```scss
@import "../../styles/tokens";
@import "../../styles/mixins";

.chatPage {
    @include page-container;
    display: flex;
    gap: 0;
    @include card;
    padding: 0;
    overflow: hidden;
    min-height: 520px;

    &__list {
        width: 300px;
        flex-shrink: 0;
        border-right: 1px solid $border-soft;
        padding: 18px 0;
        overflow-y: auto;
    }

    &__listTitle {
        font-size: 15px;
        padding: 0 18px 10px;
    }

    &__listEmpty,
    &__threadEmpty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 14px;
        padding: 40px 20px;
        color: $muted;
        font-weight: 700;
        font-size: 14px;
        text-align: center;
        flex: 1;

        a {
            font-weight: 800;
        }
    }

    &__thread {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
    }

    &__header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 20px;
        border-bottom: 1px solid $border-soft;
    }

    &__back {
        display: none;
        background: none;
        border: none;
        font-size: 24px;
        font-weight: 800;
        color: $accent-strong;
        cursor: pointer;
        padding: 0 8px;
        @include focus-ring;
    }

    &__receiver {
        font-size: 15px;
    }

    &__messages {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 18px 20px;
    }

    &__composer {
        display: flex;
        gap: 10px;
        padding: 14px 20px;
        border-top: 1px solid $border-soft;
    }

    &__input {
        @include input-pill;
        flex: 1;
        min-width: 0;
    }

    &__send {
        @include button-primary;
        padding: 10px 18px;
        font-size: 14px;
        white-space: nowrap;
    }

    @media (max-width: #{$bp-md - 1px}) {
        min-height: calc(100vh - 120px);

        &__list {
            width: 100%;
            border-right: none;
        }

        &__thread {
            display: none;
        }

        &--thread &__list {
            display: none;
        }

        &--thread &__thread {
            display: flex;
        }

        &__back {
            display: block;
        }
    }
}

.chatItem {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 18px;
    background: none;
    border: none;
    border-left: 3px solid transparent;
    cursor: pointer;
    text-align: left;
    font-family: $font;
    @include focus-ring;

    &--active {
        background: $bg;
        border-left-color: $accent-strong;
    }

    &__avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
    }

    &__body {
        flex: 1;
        min-width: 0;
    }

    &__name {
        font-weight: 800;
        font-size: 13.5px;
        color: $ink;
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &__unread {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: $accent;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
        flex-shrink: 0;
    }
}

@media (prefers-reduced-motion: no-preference) {
    .chatItem__unread {
        animation: orbit-pulse 2.4s ease-in-out infinite;
    }
}

.bubble {
    max-width: 70%;
    padding: 10px 14px;
    font-size: 14px;
    line-height: 1.45;

    &--received {
        align-self: flex-start;
        background: $bg;
        border: 1px solid $border-soft;
        border-radius: $radius-bubble $radius-bubble $radius-bubble 4px;
        color: $ink;
    }

    &--sent {
        align-self: flex-end;
        background: $accent-strong;
        color: #fff;
        border-radius: $radius-bubble $radius-bubble 4px $radius-bubble;
    }

    &__time {
        display: block;
        font-size: 10.5px;
        opacity: 0.65;
        margin-top: 4px;
    }
}
```

(`orbit-pulse` is defined globally by `Radar.scss`, which is loaded app-wide once any page imports Radar; to be safe the unread animation references it only under reduced-motion guard — if the keyframe is not visible in this file's scope at build time, copy the `orbit-pulse` keyframes block from Radar.scss into the same media query here. CSS keyframes are global at runtime, so a duplicate definition is harmless.)

- [ ] **Step 3: Tests, build, and a manual smoke note**

`npm test -w client` (18), `npm run build -w client` (clean). The task reviewer will exercise the chat flow; the implementer additionally confirms `npm test -w server` still passes (55/56 — unchanged, sanity only).

- [ ] **Step 4: Commit**

```bash
git add -A client
git commit -m "feat(client): Orbit messages — light two-pane chat, pulsing unread, mobile stacking"
```

---

### Task 9: Places, 404, final cleanup

**Files:**
- Modify: `client/src/pages/Places/Places.tsx` (JSX only), `client/src/pages/Places/Places.scss` (full replace), `client/src/components/PlacesCard/PlacesCard.tsx` (JSX only), `client/src/components/PlacesCard/PlacesCard.scss` (full replace)
- Create: `client/src/pages/NotFound/NotFound.tsx`, `client/src/pages/NotFound/NotFound.scss`
- Modify: `client/src/App.tsx` (404 route swap)
- Delete: `client/src/images/errorPage.gif`, `client/src/_variables.scss`, `client/src/_mixins.scss`

**Interfaces:**
- Consumes: tokens/mixins, `Radar`. Existing Places logic preserved: debounced q, sport select from `sportOptions` state, `coords`/`handleNearMe`, `unfiltered` dropdown derivation, error CustomAlert, `activityByKey` fallback. PlacesCard keeps props `{ place, fallbackImage }` and its `broken` onError state.
- Produces: the finished redesign.

**Binding rule:** same as Task 5.

- [ ] **Step 1: Replace the Places page JSX**

```tsx
  return (
    <div className="placesPage">
      <header className="placesPage__head">
        <h1 className="placesPage__title">Find a place to play in Sofia</h1>
        <p className="placesPage__subtitle">54 venues across the city — filter by sport or search by name</p>
      </header>
      <div className="placesPage__filters">
        <input
          className="placesPage__input"
          name="inputSearchField"
          type="text"
          placeholder="Search venues"
          /* existing searchText value/onChange */
        />
        <select className="placesPage__select" name="inputSearchField" /* existing selectedSport value/onChange */>
          <option value="">All sports</option>
          {/* existing sportOptions map */}
        </select>
        <button
          type="button"
          className={/* existing coords truthy */ ? "placesPage__nearMe placesPage__nearMe--active" : "placesPage__nearMe"}
          onClick={/* existing handleNearMe */}
        >
          {/* existing coords ? "Near me ✓" : "Near me" */}
        </button>
      </div>
      {/* existing error && <CustomAlert …/> */}
      {/* existing places.length > 0 ? (grid) : (!error && empty) — new markup: */}
      <div className="placesPage__grid">
        {/* existing places.map: <PlacesCard key={place.id} place={place} fallbackImage={…existing expression…} /> */}
      </div>
      <div className="placesPage__empty">
        <Radar size={110} />
        <p>No venues match — try another sport or search</p>
      </div>
    </div>
  );
```

- [ ] **Step 2: Replace the PlacesCard JSX** (props/state untouched — keep `broken`, `src` computation, the http guard on `site`)

```tsx
  return (
    <article className="placeCard">
      <img className="placeCard__img" src={src} alt={place.name} onError={() => setBroken(true)} />
      <div className="placeCard__body">
        <div className="placeCard__topRow">
          <h3 className="placeCard__name">{place.name}</h3>
          {place.distanceKm !== undefined && <span className="placeCard__distance">{place.distanceKm} km</span>}
        </div>
        <p className="placeCard__line">{place.address}</p>
        <p className="placeCard__line">{place.phone}</p>
        <p className="placeCard__line placeCard__line--muted">{place.workingHours}</p>
        {place.site && (
          <a
            className="placeCard__site"
            href={place.site.startsWith("http") ? place.site : `http://${place.site}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit website ↗
          </a>
        )}
      </div>
    </article>
  );
```

- [ ] **Step 3: Replace both SCSS files**

`client/src/pages/Places/Places.scss`:

```scss
@import "../../styles/tokens";
@import "../../styles/mixins";

.placesPage {
    @include page-container;

    &__title {
        font-size: 28px;
    }

    &__subtitle {
        color: $muted;
        font-size: 14px;
        margin-top: 6px;
    }

    &__filters {
        display: flex;
        gap: 10px;
        align-items: center;
        margin: 20px 0 22px;
        flex-wrap: wrap;
    }

    &__input,
    &__select {
        @include input-pill;
    }

    &__nearMe {
        @include button-ghost;
        padding: 11px 20px;
        font-size: 14px;

        &--active {
            border-color: $accent-strong;
            background: $accent-soft;
            color: $accent-deep;
        }
    }

    &__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
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
```

`client/src/components/PlacesCard/PlacesCard.scss`:

```scss
@import "../../styles/tokens";
@import "../../styles/mixins";

.placeCard {
    @include card;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    &__img {
        width: 100%;
        height: 150px;
        object-fit: cover;
        display: block;
        background: $accent-soft;
    }

    &__body {
        padding: 14px 16px 16px;
    }

    &__topRow {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
    }

    &__name {
        font-size: 15px;
    }

    &__distance {
        @include chip($amber-soft, $amber-deep);
        flex-shrink: 0;
    }

    &__line {
        color: $ink-soft;
        font-size: 13px;
        margin-top: 6px;

        &--muted {
            color: $muted;
        }
    }

    &__site {
        display: inline-block;
        font-weight: 700;
        font-size: 13px;
        margin-top: 10px;
    }
}
```

- [ ] **Step 4: Create the 404 page and swap the route**

`client/src/pages/NotFound/NotFound.tsx`:

```tsx
import { Link } from "react-router-dom";
import Radar from "../../components/Orbit/Radar";
import "./NotFound.scss";

export default function NotFound() {
  return (
    <div className="notFound">
      <Radar size={160} />
      <h1 className="notFound__title">Off the radar</h1>
      <p className="notFound__text">This page doesn&apos;t exist — but your next game does.</p>
      <Link className="notFound__cta" to="/home">
        Back home
      </Link>
    </div>
  );
}
```

`client/src/pages/NotFound/NotFound.scss`:

```scss
@import "../../styles/tokens";
@import "../../styles/mixins";

.notFound {
    @include page-container;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding-top: 72px;

    &__title {
        font-size: 30px;
        margin-top: 26px;
    }

    &__text {
        color: $muted;
        font-size: 15px;
        margin-top: 10px;
    }

    &__cta {
        @include button-primary;
        text-decoration: none;
        margin-top: 22px;
    }
}
```

In `client/src/App.tsx`: remove the `errorpic` import and the inline hedgehog JSX; add `import NotFound from "./pages/NotFound/NotFound";` and change the catch-all route to `<Route path="*" element={<NotFound />} />`. Then `git rm client/src/images/errorPage.gif`. Check `grep -rn "errorImage" client/src` — if the `.errorImage` style lived in a still-existing file, delete that rule.

- [ ] **Step 5: Retire the old token files and sweep**

Verify nothing imports them anymore: `grep -rn '"../../variables"\|"../../mixins"\|"./variables"\|"./mixins"' client/src` — expected: no hits (every rewritten SCSS imports `styles/tokens`/`styles/mixins`). Then:

```bash
git rm client/src/_variables.scss client/src/_mixins.scss
```

Old-token sweep (Global Constraints): `grep -rn "almost-white-color\|super-contrast\|contrast-transperant\|purple-color\|text-shadow\|gradientBorder" client/src` — expected: no hits. Fix any straggler by replacing with tokens.

- [ ] **Step 6: Full verification**

Run from repo root: `npm test` — expected **103 tests** (29 shared / 56 server / 18 client). Run `npm run build` — clean. Boot check: `npm run dev:memory` in background, wait for "API listening", `curl -s http://localhost:4000/api/health` → `{"status":"ok"}`, then kill the dev processes and verify ports 3000/4000 are free (`netstat -ano | grep -E ":(3000|4000).*LISTENING"` → empty; `taskkill //PID <pid> //F` for any orphans).

- [ ] **Step 7: Commit**

```bash
git add -A client
git commit -m "feat(client): Orbit places + 404; retire legacy tokens — redesign complete"
```
