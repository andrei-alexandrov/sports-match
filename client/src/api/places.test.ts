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
