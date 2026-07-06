import { fileURLToPath } from "node:url";
import type { RequestHandler } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

// No DB needed: a pass-through session keeps MongoStore out of these tests.
const noSession: RequestHandler = (_req, _res, next) => next();
const fixtureDist = fileURLToPath(new URL("./fixtures/client-dist", import.meta.url));

const spaApp = () => createApp(noSession, { clientDist: fixtureDist });

describe("serveClient", () => {
  it("serves static assets from the dist dir", async () => {
    const res = await request(spaApp()).get("/assets/app.js");
    expect(res.status).toBe(200);
    expect(res.text).toContain("fixture-asset");
  });

  it("serves index.html at the root", async () => {
    const res = await request(spaApp()).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("sports-match-fixture");
    // Deliberately > 1 KB: the hardening suite relies on this fixture
    // clearing compression's size threshold.
    expect(res.text.length).toBeGreaterThan(1024);
  });

  it("falls back to index.html for client-side routes", async () => {
    const res = await request(spaApp()).get("/buddySearch");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.text).toContain("sports-match-fixture");
  });

  it("falls back for nested client-side routes too", async () => {
    const res = await request(spaApp()).get("/events/nested/route");
    expect(res.status).toBe(200);
    expect(res.text).toContain("sports-match-fixture");
  });

  it("keeps unknown /api routes as JSON 404s", async () => {
    const res = await request(spaApp()).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: "NOT_FOUND", message: "Route not found" } });
  });

  it("does not swallow /socket.io paths", async () => {
    const res = await request(spaApp()).get("/socket.io/?EIO=4");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("does not swallow non-GET requests", async () => {
    const res = await request(spaApp()).post("/buddySearch");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("stays out of the way when clientDist is not set (dev behavior)", async () => {
    const res = await request(createApp(noSession)).get("/buddySearch");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
