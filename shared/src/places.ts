import { z } from "zod";
import { activityKeySchema } from "./activities";

export const publicPlaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  sports: z.array(activityKeySchema),
  address: z.string(),
  city: z.string(),
  neighborhood: z.string(),
  phone: z.string(),
  workingHours: z.string(),
  site: z.string().nullable(),
  image: z.string().nullable(),
  lat: z.number(),
  lng: z.number(),
  // Present only on "near me" responses.
  distanceKm: z.number().optional(),
});
export type PublicPlace = z.infer<typeof publicPlaceSchema>;

export const searchPlacesQuerySchema = z
  .object({
    sport: activityKeySchema.optional(),
    q: z.string().trim().max(100, "Search text is too long").optional(),
    // Query-string values arrive as strings; coerce before range-checking.
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
  })
  .refine((query) => (query.lat === undefined) === (query.lng === undefined), "lat and lng must be provided together");
export type SearchPlacesQuery = z.infer<typeof searchPlacesQuerySchema>;
