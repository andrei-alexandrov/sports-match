import { describe, expect, it } from "vitest";
import { createEventInputSchema, publicEventSchema, searchEventsQuerySchema } from "./events";

function baseInput() {
  return {
    title: "Morning tennis",
    sport: "tennis",
    type: "social",
    locationText: "Борисова градина, корт 3",
    startsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    durationMinutes: 90,
    capacity: 4,
  };
}

describe("createEventInputSchema", () => {
  it("accepts a valid social event with a text location", () => {
    expect(createEventInputSchema.safeParse(baseInput()).success).toBe(true);
  });

  it("accepts a training event with a price and a placeId", () => {
    const input = { ...baseInput(), type: "training", price: "15 lv", placeId: "abc123", locationText: undefined };
    expect(createEventInputSchema.safeParse(input).success).toBe(true);
  });

  it("requires a venue: placeId or locationText", () => {
    const input = { ...baseInput(), locationText: undefined };
    expect(createEventInputSchema.safeParse(input).success).toBe(false);
  });

  it("rejects a price on a social event", () => {
    expect(createEventInputSchema.safeParse({ ...baseInput(), price: "10 lv" }).success).toBe(false);
  });

  it("rejects a start time in the past", () => {
    const input = { ...baseInput(), startsAt: new Date(Date.now() - 1000).toISOString() };
    expect(createEventInputSchema.safeParse(input).success).toBe(false);
  });

  it("rejects an unparseable start time", () => {
    expect(createEventInputSchema.safeParse({ ...baseInput(), startsAt: "not-a-date" }).success).toBe(false);
  });

  it("enforces capacity and duration bounds", () => {
    expect(createEventInputSchema.safeParse({ ...baseInput(), capacity: 1 }).success).toBe(false);
    expect(createEventInputSchema.safeParse({ ...baseInput(), capacity: 101 }).success).toBe(false);
    expect(createEventInputSchema.safeParse({ ...baseInput(), durationMinutes: 10 }).success).toBe(false);
    expect(createEventInputSchema.safeParse({ ...baseInput(), durationMinutes: 500 }).success).toBe(false);
  });

  it("enforces title bounds", () => {
    expect(createEventInputSchema.safeParse({ ...baseInput(), title: "ab" }).success).toBe(false);
    expect(createEventInputSchema.safeParse({ ...baseInput(), title: "x".repeat(81) }).success).toBe(false);
  });
});

describe("searchEventsQuerySchema", () => {
  it("accepts empty, type, and sport; rejects unknown values", () => {
    expect(searchEventsQuerySchema.safeParse({}).success).toBe(true);
    expect(searchEventsQuerySchema.safeParse({ type: "training", sport: "tennis" }).success).toBe(true);
    expect(searchEventsQuerySchema.safeParse({ type: "party" }).success).toBe(false);
    expect(searchEventsQuerySchema.safeParse({ sport: "quidditch" }).success).toBe(false);
  });
});

describe("publicEventSchema", () => {
  it("accepts a full event", () => {
    const event = {
      id: "e1",
      title: "Morning tennis",
      sport: "tennis",
      type: "training",
      description: null,
      host: "coach",
      hostTrainer: true,
      place: { id: "p1", name: "Тенис клуб Бояна", address: "кв. Бояна, ул. Кумата 6" },
      locationText: null,
      startsAt: new Date().toISOString(),
      durationMinutes: 60,
      capacity: 8,
      participants: ["mira"],
      price: "15 lv",
      status: "active",
    };
    expect(publicEventSchema.safeParse(event).success).toBe(true);
  });
});
