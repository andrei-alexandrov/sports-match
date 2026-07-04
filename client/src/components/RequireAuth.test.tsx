import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../context/AuthContext";
import RequireAuth from "./RequireAuth";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RequireAuth", () => {
  it("redirects anonymous visitors to /login", async () => {
    // fetchMe returns 401 → user stays null → redirect.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "You must be logged in" } }), { status: 401 }),
      ),
    );
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/profile"]}>
          <Routes>
            <Route path="/login" element={<div>Login page</div>} />
            <Route element={<RequireAuth />}>
              <Route path="/profile" element={<div>Secret profile</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );
    expect(await screen.findByText("Login page")).toBeDefined();
    expect(screen.queryByText("Secret profile")).toBeNull();
  });

  it("renders the protected page for a logged-in user", async () => {
    const user = { id: "1", username: "andrei", age: null, city: "", gender: "", image: "", activities: [] };
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ user }), { status: 200 })));
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/profile"]}>
          <Routes>
            <Route path="/login" element={<div>Login page</div>} />
            <Route element={<RequireAuth />}>
              <Route path="/profile" element={<div>Secret profile</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );
    expect(await screen.findByText("Secret profile")).toBeDefined();
  });
});
