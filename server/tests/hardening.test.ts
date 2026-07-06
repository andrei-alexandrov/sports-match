import { fileURLToPath } from "node:url";
import type { RequestHandler } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

// No DB needed: a pass-through session keeps MongoStore out of these tests.
const noSession: RequestHandler = (_req, _res, next) => next();
const fixtureDist = fileURLToPath(new URL("./fixtures/client-dist", import.meta.url));

describe("/api rate limiting", () => {
  it("responds 429 with the RATE_LIMITED envelope once the budget is spent", async () => {
    const app = createApp(noSession, { apiRateLimitMax: 3 });
    for (let i = 0; i < 3; i += 1) {
      const ok = await request(app).get("/api/health");
      expect(ok.status).toBe(200);
    }
    const blocked = await request(app).get("/api/health");
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe("RATE_LIMITED");
    expect(typeof blocked.body.error.message).toBe("string");
  });

  it("limits only /api — the SPA keeps serving after the budget is spent", async () => {
    const app = createApp(noSession, { apiRateLimitMax: 1, clientDist: fixtureDist });
    const ok = await request(app).get("/api/health");
    expect(ok.status).toBe(200);
    const blocked = await request(app).get("/api/health");
    expect(blocked.status).toBe(429);
    const page = await request(app).get("/buddySearch");
    expect(page.status).toBe(200);
    expect(page.text).toContain("sports-match-fixture");
  });

  it("keys budgets by the edge-provided client IP when present", async () => {
    const app = createApp(noSession, { apiRateLimitMax: 1 });
    const first = await request(app).get("/api/health").set("cf-connecting-ip", "203.0.113.10");
    expect(first.status).toBe(200);
    const blocked = await request(app).get("/api/health").set("cf-connecting-ip", "203.0.113.10");
    expect(blocked.status).toBe(429);
    const otherClient = await request(app).get("/api/health").set("cf-connecting-ip", "203.0.113.99");
    expect(otherClient.status).toBe(200);
  });
});

describe("compression", () => {
  it("gzips bodies over the threshold when the client accepts gzip", async () => {
    const app = createApp(noSession, { clientDist: fixtureDist });
    const res = await request(app).get("/").set("Accept-Encoding", "gzip");
    expect(res.status).toBe(200);
    expect(res.headers["content-encoding"]).toBe("gzip");
    // supertest decompresses transparently; the body must still be intact.
    expect(res.text).toContain("sports-match-fixture");
  });
});
