import { afterEach, describe, expect, it, vi } from "vitest";
import { searchEvents } from "./events";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("searchEvents", () => {
  it("builds the query string from defined params only", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ events: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await searchEvents({ type: "training", sport: "tennis" });
    expect(fetchMock).toHaveBeenCalledWith("/api/events?type=training&sport=tennis", expect.anything());
    await searchEvents({});
    expect(fetchMock).toHaveBeenLastCalledWith("/api/events", expect.anything());
  });
});
