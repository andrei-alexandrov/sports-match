import type { ActivityKey, EventType, PublicEvent } from "@sports-match/shared";
import { ACTIVITY_KEYS } from "@sports-match/shared";
import mongoose from "mongoose";

export interface EventFields {
  title: string;
  sport: ActivityKey;
  type: EventType;
  description: string | null;
  host: string;
  hostTrainer: boolean;
  placeId: string | null;
  placeName: string | null;
  placeAddress: string | null;
  locationText: string | null;
  startsAt: Date;
  durationMinutes: number;
  capacity: number;
  participants: string[];
  price: string | null;
  status: "active" | "cancelled";
}

const eventSchema = new mongoose.Schema<EventFields>({
  title: { type: String, required: true },
  sport: { type: String, enum: [...ACTIVITY_KEYS], required: true },
  type: { type: String, enum: ["training", "social"], required: true },
  description: { type: String, default: null },
  host: { type: String, required: true },
  hostTrainer: { type: Boolean, required: true },
  placeId: { type: String, default: null },
  placeName: { type: String, default: null },
  placeAddress: { type: String, default: null },
  locationText: { type: String, default: null },
  startsAt: { type: Date, required: true },
  durationMinutes: { type: Number, required: true },
  capacity: { type: Number, required: true },
  participants: { type: [String], default: [] },
  price: { type: String, default: null },
  status: { type: String, enum: ["active", "cancelled"], default: "active" },
});
eventSchema.index({ startsAt: 1 });

export const Event = mongoose.model<EventFields>("Event", eventSchema);
export type EventLean = EventFields & { _id: mongoose.Types.ObjectId };

export function toPublicEvent(event: EventLean): PublicEvent {
  return {
    id: event._id.toString(),
    title: event.title,
    sport: event.sport,
    type: event.type,
    description: event.description,
    host: event.host,
    hostTrainer: event.hostTrainer,
    place:
      event.placeId && event.placeName && event.placeAddress
        ? { id: event.placeId, name: event.placeName, address: event.placeAddress }
        : null,
    locationText: event.locationText,
    startsAt: event.startsAt.toISOString(),
    durationMinutes: event.durationMinutes,
    capacity: event.capacity,
    participants: event.participants,
    price: event.price,
    status: event.status,
  };
}
