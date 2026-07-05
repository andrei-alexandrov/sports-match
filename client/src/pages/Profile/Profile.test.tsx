import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../context/AuthContext";
import ProfilePage from "./Profile";

afterEach(() => {
  vi.unstubAllGlobals();
});

// Matches the wire shape of shared/src/schemas.ts's publicUserSchema.
const mockUser = {
  id: "u1",
  username: "andrei",
  city: "Sofia",
  age: 30,
  gender: "male",
  image: "",
  activities: ["tennis"],
};

function stubFetch(onPatch?: (body: unknown) => void) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit): Promise<Response> => {
    if (url === "/api/auth/me") {
      return new Response(JSON.stringify({ user: mockUser }), { status: 200 });
    }
    if (url === "/api/users/me" && init?.method === "PATCH") {
      const body: unknown = init.body ? JSON.parse(init.body as string) : {};
      onPatch?.(body);
      return new Response(
        JSON.stringify({ user: { ...mockUser, ...(body as Record<string, unknown>) } }),
        { status: 200 },
      );
    }
    return new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "unhandled" } }), { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderProfile() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    </AuthProvider>,
  );
}

async function waitForLoad() {
  // "Sofia" renders twice in view mode (header meta + the City value row), so wait
  // on the uniquely-rendered username instead.
  await waitFor(() => expect(screen.getByText("andrei")).toBeTruthy());
}

async function enterEditMode() {
  await waitForLoad();
  fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
  await waitFor(() => expect((screen.getByLabelText("City") as HTMLInputElement).value).toBe("Sofia"));
}

describe("ProfilePage", () => {
  it("renders view mode by default, with no editable inputs", async () => {
    stubFetch();
    renderProfile();

    await waitForLoad();
    expect(screen.getAllByText("Sofia").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("City")).toBeNull();
    expect(screen.queryByRole("textbox", { name: "City" })).toBeNull();
    expect(screen.getByRole("button", { name: "Edit profile" })).toBeTruthy();
  });

  it("prefills the user's current city, age, and gender after load", async () => {
    stubFetch();
    renderProfile();

    await enterEditMode();
    expect((screen.getByLabelText("Age") as HTMLInputElement).value).toBe("30");
    expect((screen.getByLabelText("Gender") as HTMLSelectElement).value).toBe("male");
  });

  it("disables Save until a field is edited", async () => {
    stubFetch();
    renderProfile();

    await enterEditMode();
    const saveButton = screen.getByRole("button", { name: "Save" }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Plovdiv" } });
    expect(saveButton.disabled).toBe(false);
  });

  it("saves a PATCH to /api/users/me whose body contains only the edited field", async () => {
    let patchedBody: unknown = null;
    const fetchMock = stubFetch((body) => {
      patchedBody = body;
    });
    renderProfile();

    await enterEditMode();
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Plovdiv" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(patchedBody).toEqual({ city: "Plovdiv" }));
    const patchCall = fetchMock.mock.calls.find(([url]) => url === "/api/users/me");
    expect(patchCall?.[1]).toMatchObject({ method: "PATCH" });
  });

  it("discards the typed change and returns to view mode when Cancel is clicked", async () => {
    stubFetch();
    renderProfile();

    await enterEditMode();
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Plovdiv" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByLabelText("City")).toBeNull();
    expect(screen.getAllByText("Sofia").length).toBeGreaterThan(0);
    expect(screen.queryByText("Plovdiv")).toBeNull();
  });

  it("makes the avatar photo control keyboard-operable", async () => {
    stubFetch();
    renderProfile();

    await waitForLoad();
    const avatarControl = screen.getByTitle("Change photo");
    expect(avatarControl.getAttribute("role")).toBe("button");
    expect(avatarControl.tabIndex).toBe(0);
  });
});
