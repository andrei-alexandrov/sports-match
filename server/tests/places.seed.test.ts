import { describe, expect, it } from "vitest";
import { Place } from "../src/models/Place";
import { seedPlaces } from "../src/seed/places";
import { setupTestDb } from "./helpers";

setupTestDb();

describe("seedPlaces", () => {
  it("seeds the 54 curated venues into an empty database", async () => {
    await seedPlaces();
    expect(await Place.countDocuments({})).toBe(54);
    const fireball = await Place.findOne({ name: "Fireball sports hall" });
    expect(fireball?.sports).toEqual(["badminton"]);
    // The prototype's "billiards" venues carry both cue-sport catalogue keys.
    const billiards = await Place.findOne({ name: "Билярд клуб Дружба" });
    expect(billiards?.sports).toEqual(["snooker", "pool"]);
  });

  it("does not duplicate venues when run twice", async () => {
    await seedPlaces();
    await seedPlaces();
    expect(await Place.countDocuments({})).toBe(54);
  });

  it("stores coordinates as GeoJSON [lng, lat]", async () => {
    await seedPlaces();
    const fireball = await Place.findOne({ name: "Fireball sports hall" });
    expect(fireball?.location.type).toBe("Point");
    expect(fireball?.location.coordinates[0]).toBeCloseTo(23.393, 2);
    expect(fireball?.location.coordinates[1]).toBeCloseTo(42.6515, 2);
  });
});
