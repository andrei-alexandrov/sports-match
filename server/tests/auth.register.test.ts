import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { User } from "../src/models/User";
import { setupTestDb } from "./helpers";

setupTestDb();

const valid = { username: "andrei", password: "Secret1" };

describe("POST /api/auth/register", () => {
  it("creates the user, starts a session, and returns the public user", async () => {
    const res = await request(createApp()).post("/api/auth/register").send(valid);
    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({
      id: expect.any(String),
      username: "andrei",
      age: null,
      city: "",
      gender: "",
      image: "",
      activities: [],
    });
    expect(res.headers["set-cookie"]?.[0]).toContain("HttpOnly");
  });

  it("stores a bcrypt hash, never the plaintext password", async () => {
    await request(createApp()).post("/api/auth/register").send(valid);
    const user = await User.findOne({ username: "andrei" });
    expect(user?.passwordHash).not.toBe(valid.password);
    expect(user?.passwordHash).toMatch(/^\$2/);
  });

  it("rejects a duplicate username with 409 USERNAME_TAKEN", async () => {
    const app = createApp();
    await request(app).post("/api/auth/register").send(valid);
    const res = await request(app).post("/api/auth/register").send(valid);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("USERNAME_TAKEN");
  });

  it("rejects invalid input with 400 VALIDATION_ERROR and the shared message", async () => {
    const res = await request(createApp())
      .post("/api/auth/register")
      .send({ username: "ab", password: "Secret1" });
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual({
      code: "VALIDATION_ERROR",
      message: "Username must be at least 3 characters long",
    });
  });
});
