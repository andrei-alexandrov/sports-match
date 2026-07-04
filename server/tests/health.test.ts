import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { setupTestDb } from "./helpers";

setupTestDb();

describe("GET /api/health", () => {
  it("returns ok", async () => {
    const res = await request(createApp()).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("returns the error envelope for unknown routes", async () => {
    const res = await request(createApp()).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: "NOT_FOUND", message: "Route not found" } });
  });
});
