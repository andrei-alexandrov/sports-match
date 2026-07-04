import type { ActivityKey, PublicPlace } from "@sports-match/shared";
import { request } from "./http";

export interface SearchPlacesParams {
  sport?: ActivityKey;
  q?: string;
  lat?: number;
  lng?: number;
}

export async function searchPlaces(params: SearchPlacesParams): Promise<PublicPlace[]> {
  const query = new URLSearchParams();
  if (params.sport) {
    query.set("sport", params.sport);
  }
  if (params.q) {
    query.set("q", params.q);
  }
  if (params.lat !== undefined && params.lng !== undefined) {
    query.set("lat", String(params.lat));
    query.set("lng", String(params.lng));
  }
  const qs = query.toString();
  const res = await request<{ places: PublicPlace[] }>(`/api/places${qs ? `?${qs}` : ""}`);
  return res.places;
}
