import { Place } from "../models/Place";
import { PLACES_SEED } from "./placesData";

/**
 * Idempotent boot seed for the curated venue catalogue. Safe because the
 * catalogue is read-only: no user writes means the count guard can never
 * skip a legitimate re-seed. createIndexes() runs unconditionally so the
 * 2dsphere index $geoNear depends on exists even when the collection was
 * dropped (tests) or the process is a fresh dev:memory boot.
 */
export async function seedPlaces(): Promise<void> {
  await Place.createIndexes();
  const count = await Place.countDocuments({});
  if (count > 0) {
    return;
  }
  await Place.insertMany(
    PLACES_SEED.map(({ lat, lng, ...venue }) => ({
      ...venue,
      location: { type: "Point", coordinates: [lng, lat] },
    })),
  );
}
