import type { ActivityKey, PublicPlace } from "@sports-match/shared";
import { ACTIVITY_KEYS } from "@sports-match/shared";
import mongoose from "mongoose";

export interface PlaceFields {
  name: string;
  sports: ActivityKey[];
  address: string;
  city: string;
  neighborhood: string;
  phone: string;
  workingHours: string;
  site: string | null;
  image: string | null;
  // GeoJSON: coordinates are [lng, lat] — this ordering never leaves the
  // server; the wire format is flat lat/lng (see toPublicPlace).
  location: { type: "Point"; coordinates: [number, number] };
}

const placeSchema = new mongoose.Schema<PlaceFields>({
  name: { type: String, required: true },
  sports: { type: [String], enum: [...ACTIVITY_KEYS], required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  neighborhood: { type: String, required: true },
  phone: { type: String, required: true },
  workingHours: { type: String, required: true },
  site: { type: String, default: null },
  image: { type: String, default: null },
  location: {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: { type: [Number], required: true },
  },
});
placeSchema.index({ location: "2dsphere" });

export const Place = mongoose.model<PlaceFields>("Place", placeSchema);
export type PlaceLean = PlaceFields & { _id: mongoose.Types.ObjectId };

export function toPublicPlace(place: PlaceLean, distanceMeters?: number): PublicPlace {
  const [lng, lat] = place.location.coordinates;
  return {
    id: place._id.toString(),
    name: place.name,
    sports: place.sports,
    address: place.address,
    city: place.city,
    neighborhood: place.neighborhood,
    phone: place.phone,
    workingHours: place.workingHours,
    site: place.site,
    image: place.image,
    lat,
    lng,
    ...(distanceMeters !== undefined ? { distanceKm: Math.round(distanceMeters / 100) / 10 } : {}),
  };
}
