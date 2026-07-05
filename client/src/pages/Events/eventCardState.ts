import type { PublicEvent } from "@sports-match/shared";

export type EventCardState = "cancelled" | "host" | "joined" | "full" | "joinable";

/** Precedence matters: a cancelled event is cancelled even for its host. */
export function eventCardState(event: PublicEvent, me: string): EventCardState {
  if (event.status === "cancelled") {
    return "cancelled";
  }
  if (event.host === me) {
    return "host";
  }
  if (event.participants.includes(me)) {
    return "joined";
  }
  if (event.participants.length >= event.capacity) {
    return "full";
  }
  return "joinable";
}
