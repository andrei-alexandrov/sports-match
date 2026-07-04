import type { ActivityKey, PublicUser, UpdateProfileInput } from "@sports-match/shared";
import { request } from "./http";

export async function updateProfile(input: UpdateProfileInput): Promise<PublicUser> {
  const res = await request<{ user: PublicUser }>("/api/users/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return res.user;
}

export interface SearchUsersParams {
  activity?: ActivityKey;
  city?: string;
}

export async function searchUsers(params: SearchUsersParams): Promise<PublicUser[]> {
  const query = new URLSearchParams();
  if (params.activity) {
    query.set("activity", params.activity);
  }
  if (params.city) {
    query.set("city", params.city);
  }
  const qs = query.toString();
  const res = await request<{ users: PublicUser[] }>(`/api/users/search${qs ? `?${qs}` : ""}`);
  return res.users;
}
