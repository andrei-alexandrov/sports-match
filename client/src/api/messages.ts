import type { Conversation, PublicMessage } from "@sports-match/shared";
import { request } from "./http";

export async function fetchConversations(): Promise<Conversation[]> {
  const res = await request<{ conversations: Conversation[] }>("/api/messages/conversations");
  return res.conversations;
}

export async function fetchThread(username: string): Promise<PublicMessage[]> {
  const res = await request<{ messages: PublicMessage[] }>(
    `/api/messages/with/${encodeURIComponent(username)}`,
  );
  return res.messages;
}

export function markThreadRead(username: string): Promise<void> {
  return request<void>(`/api/messages/with/${encodeURIComponent(username)}/read`, { method: "PATCH" });
}
