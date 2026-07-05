import type { Express } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { setupTestDb } from "./helpers";

setupTestDb();

async function registeredAgent(app: Express, username: string): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send({ username, password: "Secret1" });
  return agent;
}

describe("trainer profile fields", () => {
  it("defaults to non-trainer on register", async () => {
    const app = createApp();
    const me = await registeredAgent(app, "mira");
    const res = await me.get("/api/auth/me");
    expect(res.body.user.trainer).toBe(false);
    expect(res.body.user.trainerBio).toBe("");
  });

  it("round-trips trainer flag and bio through PATCH /api/users/me", async () => {
    const app = createApp();
    const me = await registeredAgent(app, "coach");
    const res = await me.patch("/api/users/me").send({ trainer: true, trainerBio: "Tennis coach, 10y" });
    expect(res.status).toBe(200);
    expect(res.body.user.trainer).toBe(true);
    expect(res.body.user.trainerBio).toBe("Tennis coach, 10y");
    const after = await me.get("/api/auth/me");
    expect(after.body.user.trainer).toBe(true);
  });

  it("rejects an over-long trainer bio", async () => {
    const app = createApp();
    const me = await registeredAgent(app, "coach");
    const res = await me.patch("/api/users/me").send({ trainerBio: "x".repeat(121) });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
