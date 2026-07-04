import { describe, expect, it } from "vitest";
import { publicPlaceSchema, searchPlacesQuerySchema } from "./places";

describe("searchPlacesQuerySchema", () => {
  it("accepts an empty query", () => {
    expect(searchPlacesQuerySchema.safeParse({}).success).toBe(true);
  });

  it("coerces lat/lng query strings to numbers", () => {
    const result = searchPlacesQuerySchema.safeParse({ lat: "42.6852", lng: "23.319" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lat).toBeCloseTo(42.6852);
      expect(result.data.lng).toBeCloseTo(23.319);
    }
  });

  it("rejects lat without lng and lng without lat", () => {
    expect(searchPlacesQuerySchema.safeParse({ lat: "42.7" }).success).toBe(false);
    expect(searchPlacesQuerySchema.safeParse({ lng: "23.3" }).success).toBe(false);
  });

  it("rejects out-of-range coordinates", () => {
    expect(searchPlacesQuerySchema.safeParse({ lat: "91", lng: "23.3" }).success).toBe(false);
    expect(searchPlacesQuerySchema.safeParse({ lat: "42.7", lng: "181" }).success).toBe(false);
  });

  it("rejects an unknown sport key", () => {
    expect(searchPlacesQuerySchema.safeParse({ sport: "quidditch" }).success).toBe(false);
  });

  it("trims q and rejects over-long q", () => {
    const trimmed = searchPlacesQuerySchema.safeParse({ q: "  зала  " });
    expect(trimmed.success).toBe(true);
    if (trimmed.success) {
      expect(trimmed.data.q).toBe("зала");
    }
    expect(searchPlacesQuerySchema.safeParse({ q: "x".repeat(101) }).success).toBe(false);
  });
});

describe("publicPlaceSchema", () => {
  it("accepts a venue with and without distanceKm", () => {
    const venue = {
      id: "abc",
      name: "Зала",
      sports: ["tennis"],
      address: "ул. Тестова 1",
      city: "София",
      neighborhood: "Център",
      phone: "0888 000 000",
      workingHours: "Понеделник - неделя: 06:00 - 23:00",
      site: null,
      image: null,
      lat: 42.7,
      lng: 23.3,
    };
    expect(publicPlaceSchema.safeParse(venue).success).toBe(true);
    expect(publicPlaceSchema.safeParse({ ...venue, distanceKm: 1.2 }).success).toBe(true);
  });
});
