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
