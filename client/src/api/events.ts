import type { ActivityKey, CreateEventInput, EventType, PublicEvent } from "@sports-match/shared";
import { request } from "./http";

export interface SearchEventsParams {
  type?: EventType;
  sport?: ActivityKey;
}

export async function searchEvents(params: SearchEventsParams): Promise<PublicEvent[]> {
  const query = new URLSearchParams();
  if (params.type) {
    query.set("type", params.type);
  }
  if (params.sport) {
    query.set("sport", params.sport);
  }
  const qs = query.toString();
  const res = await request<{ events: PublicEvent[] }>(`/api/events${qs ? `?${qs}` : ""}`);
  return res.events;
}

export async function createEvent(input: CreateEventInput): Promise<PublicEvent> {
  const res = await request<{ event: PublicEvent }>("/api/events", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.event;
}

async function membership(id: string, action: "join" | "leave" | "cancel"): Promise<PublicEvent> {
  const res = await request<{ event: PublicEvent }>(`/api/events/${encodeURIComponent(id)}/${action}`, {
    method: "POST",
  });
  return res.event;
}

export const joinEvent = (id: string): Promise<PublicEvent> => membership(id, "join");
export const leaveEvent = (id: string): Promise<PublicEvent> => membership(id, "leave");
export const cancelEvent = (id: string): Promise<PublicEvent> => membership(id, "cancel");
