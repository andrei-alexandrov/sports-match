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

  it("stores validated, deduplicated activities but never passwordHash or username", async () => {
    const agent = request.agent(createApp());
    await agent.post("/api/auth/register").send(creds);
    const res = await agent
      .patch("/api/users/me")
      .send({ activities: ["tennis", "tennis", "yoga"], passwordHash: "owned", username: "hijacked" });
    expect(res.status).toBe(200);
    expect(res.body.user.activities).toEqual(["tennis", "yoga"]);
    const user = await User.findOne({ username: "andrei" });
    expect(user?.username).toBe("andrei");
    expect(user?.activities).toEqual(["tennis", "yoga"]);
    expect(user?.passwordHash).toMatch(/^\$2/);
  });

  it("rejects activities outside the catalogue", async () => {
    const agent = request.agent(createApp());
    await agent.post("/api/auth/register").send(creds);
    const res = await agent.patch("/api/users/me").send({ activities: ["hacked"] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
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

  it("returns 401 when the session's user no longer exists", async () => {
    const agent = request.agent(createApp());
    await agent.post("/api/auth/register").send(creds);
    await User.deleteOne({ username: creds.username });
    const res = await agent.patch("/api/users/me").send({ city: "Sofia" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("accepts an empty patch as a no-op", async () => {
    const agent = request.agent(createApp());
    await agent.post("/api/auth/register").send(creds);
    const res = await agent.patch("/api/users/me").send({});
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe(creds.username);
  });
});
