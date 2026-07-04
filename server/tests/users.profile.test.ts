import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { User } from "../src/models/User";
import { setupTestDb } from "./helpers";

setupTestDb();

const creds = { username: "andrei", password: "Secret1" };

describe("PATCH /api/users/me", () => {
  it("updates provided fields, persists them, and leaves others untouched", async () => {
    const agent = request.agent(createApp());
    await agent.post("/api/auth/register").send(creds);

    const res = await agent.patch("/api/users/me").send({ age: 30, city: "Sofia", gender: "male" });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ username: "andrei", age: 30, city: "Sofia", gender: "male" });

    const cityOnly = await agent.patch("/api/users/me").send({ city: "Plovdiv" });
    expect(cityOnly.body.user).toMatchObject({ age: 30, city: "Plovdiv" });
  });

  it("cannot mass-assign protected fields like activities or passwordHash", async () => {
    const agent = request.agent(createApp());
    await agent.post("/api/auth/register").send(creds);
    const res = await agent
      .patch("/api/users/me")
      .send({ city: "Sofia", activities: ["hacked"], passwordHash: "owned" });
    expect(res.status).toBe(200);
    expect(res.body.user.city).toBe("Sofia");
    const user = await User.findOne({ username: "andrei" });
    expect(user?.city).toBe("Sofia");
    expect(user?.activities).toEqual([]);
    expect(user?.passwordHash).toMatch(/^\$2/);
  });

  it("rejects invalid values with 400", async () => {
    const agent = request.agent(createApp());
    await agent.post("/api/auth/register").send(creds);
    const res = await agent.patch("/api/users/me").send({ age: 150 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("requires authentication", async () => {
    const res = await request(createApp()).patch("/api/users/me").send({ city: "Sofia" });
    expect(res.status).toBe(401);
  });
});
