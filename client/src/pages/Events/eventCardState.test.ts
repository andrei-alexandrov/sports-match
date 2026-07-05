import type { PublicEvent } from "@sports-match/shared";
import { describe, expect, it } from "vitest";
import { eventCardState } from "./eventCardState";

function event(overrides: Partial<PublicEvent>): PublicEvent {
  return {
    id: "e1", title: "Run", sport: "running", type: "social", description: null,
    host: "mira", hostTrainer: false, place: null, locationText: "парк",
    startsAt: new Date().toISOString(), durationMinutes: 60, capacity: 3,
    participants: ["mira"], price: null, status: "active",
    ...overrides,
  };
}

describe("eventCardState", () => {
  it("orders precedence: cancelled > host > joined > full > joinable", () => {
    expect(eventCardState(event({ status: "cancelled" }), "bob")).toBe("cancelled");
    expect(eventCardState(event({}), "mira")).toBe("host");
    expect(eventCardState(event({ participants: ["mira", "bob"] }), "bob")).toBe("joined");
    expect(eventCardState(event({ participants: ["mira", "x", "y"] }), "bob")).toBe("full");
    expect(eventCardState(event({}), "bob")).toBe("joinable");
  });
});
