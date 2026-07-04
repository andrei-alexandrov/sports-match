import type { LoginInput, PublicUser, RegisterInput } from "@sports-match/shared";
import { request } from "./http";

export async function register(input: RegisterInput): Promise<PublicUser> {
  const res = await request<{ user: PublicUser }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.user;
}

export async function login(input: LoginInput): Promise<PublicUser> {
  const res = await request<{ user: PublicUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.user;
}

export function logout(): Promise<void> {
  return request<void>("/api/auth/logout", { method: "POST" });
}

export async function fetchMe(): Promise<PublicUser> {
  const res = await request<{ user: PublicUser }>("/api/auth/me");
  return res.user;
}
