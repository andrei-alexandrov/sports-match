import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, request } from "./http";

function stubFetch(status: number, body: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(body === null ? null : JSON.stringify(body), { status })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("request", () => {
  it("returns the parsed body on success", async () => {
    stubFetch(200, { user: { username: "andrei" } });
    const result = await request<{ user: { username: string } }>("/api/auth/me");
    expect(result.user.username).toBe("andrei");
  });

  it("returns undefined for 204 responses", async () => {
    stubFetch(204, null);
    await expect(request<void>("/api/auth/logout", { method: "POST" })).resolves.toBeUndefined();
  });

  it("throws ApiError with the server's code and message on failure", async () => {
    stubFetch(409, { error: { code: "USERNAME_TAKEN", message: "Username already exists" } });
    const promise = request("/api/auth/register", { method: "POST", body: "{}" });
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({ status: 409, code: "USERNAME_TAKEN", message: "Username already exists" });
  });

  it("throws a generic ApiError when the body is not the envelope", async () => {
    stubFetch(502, null);
    await expect(request("/api/health")).rejects.toMatchObject({ status: 502, code: "UNKNOWN" });
  });
});
