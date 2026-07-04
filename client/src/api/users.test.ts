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
