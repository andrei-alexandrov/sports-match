import type { PublicUser, UpdateProfileInput } from "@sports-match/shared";
import { request } from "./http";

export async function updateProfile(input: UpdateProfileInput): Promise<PublicUser> {
  const res = await request<{ user: PublicUser }>("/api/users/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return res.user;
}
