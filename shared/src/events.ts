import { z } from "zod";
import { activityKeySchema } from "./activities";

export const eventTypeSchema = z.enum(["training", "social"]);
export type EventType = z.infer<typeof eventTypeSchema>;

export const createEventInputSchema = z
  .object({
    title: z.string().trim().min(3, "Title is too short").max(80, "Title is too long"),
    sport: activityKeySchema,
    type: eventTypeSchema,
    description: z.string().trim().max(500, "Description is too long").optional(),
    placeId: z.string().optional(),
    locationText: z.string().trim().min(3, "Location is too short").max(120, "Location is too long").optional(),
    startsAt: z.string().refine((value) => {
      const date = new Date(value);
      return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
    }, "Start time must be in the future"),
    durationMinutes: z.number().int().min(15, "Too short").max(480, "Too long"),
    capacity: z.number().int().min(2, "At least 2 spots").max(100, "At most 100 spots"),
    price: z.string().trim().max(40, "Price is too long").optional(),
  })
  .refine((input) => Boolean(input.placeId) || Boolean(input.locationText), {
    message: "Pick a venue or enter a location",
  })
  .refine((input) => !input.price || input.type === "training", {
    message: "Only training events can have a price",
  });
export type CreateEventInput = z.infer<typeof createEventInputSchema>;

export const publicEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  sport: activityKeySchema,
  type: eventTypeSchema,
  description: z.string().nullable(),
  host: z.string(),
  hostTrainer: z.boolean(),
  place: z.object({ id: z.string(), name: z.string(), address: z.string() }).nullable(),
  locationText: z.string().nullable(),
  startsAt: z.string(),
  durationMinutes: z.number().int(),
  capacity: z.number().int(),
  participants: z.array(z.string()),
  price: z.string().nullable(),
  status: z.enum(["active", "cancelled"]),
});
export type PublicEvent = z.infer<typeof publicEventSchema>;

export const searchEventsQuerySchema = z.object({
  type: eventTypeSchema.optional(),
  sport: activityKeySchema.optional(),
});
export type SearchEventsQuery = z.infer<typeof searchEventsQuerySchema>;
