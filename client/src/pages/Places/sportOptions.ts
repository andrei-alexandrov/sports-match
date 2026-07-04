import type { PublicPlace } from "@sports-match/shared";
import { CLIENT_ACTIVITIES, type ClientActivity } from "../../activities/catalogue";

/**
 * The sports dropdown lists only sports that actually have venues — the
 * prototype derived this from its full JSON; here it comes from the first
 * unfiltered fetch. Sorted by label like the buddy search dropdown.
 */
export function sportOptionsFrom(places: PublicPlace[]): ClientActivity[] {
  const present = new Set(places.flatMap((place) => place.sports));
  return CLIENT_ACTIVITIES.filter((activity) => present.has(activity.key)).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}
