import { searchPlacesQuerySchema, type SearchPlacesQuery } from "@sports-match/shared";
import { Router } from "express";
import type { FilterQuery } from "mongoose";
import { requireAuth } from "../middleware/requireAuth";
import { validateQuery } from "../middleware/validateQuery";
import { Place, toPublicPlace, type PlaceFields, type PlaceLean } from "../models/Place";
import { escapeRegExp } from "../util/escapeRegExp";

export const placesRouter = Router();

// Documented cap (see phase 4 spec): no pagination at catalogue scale.
const PLACES_RESULT_CAP = 100;

placesRouter.get("/", requireAuth, validateQuery(searchPlacesQuerySchema), async (_req, res) => {
  // Express 5's req.query is a read-only getter; validateQuery parks the parsed result here.
  const { sport, q, lat, lng } = res.locals.query as SearchPlacesQuery;

  const filter: FilterQuery<PlaceFields> = {};
  if (sport) {
    filter.sports = sport;
  }
  if (q) {
    const pattern = escapeRegExp(q);
    filter.$or = [
      { name: { $regex: pattern, $options: "i" } },
      { address: { $regex: pattern, $options: "i" } },
    ];
  }

  if (lat !== undefined && lng !== undefined) {
    // $geoNear must be the first pipeline stage, so the filters ride along
    // as its query option instead of a separate $match. Results come back
    // in ascending distance order with the distance in meters.
    const nearby = await Place.aggregate<PlaceLean & { distance: number }>([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "distance",
          spherical: true,
          query: filter,
        },
      },
      { $limit: PLACES_RESULT_CAP },
    ]);
    res.json({ places: nearby.map((place) => toPublicPlace(place, place.distance)) });
    return;
  }

  const places = await Place.find(filter).sort({ name: 1 }).limit(PLACES_RESULT_CAP).lean<PlaceLean[]>();
  res.json({ places: places.map((place) => toPublicPlace(place)) });
});
