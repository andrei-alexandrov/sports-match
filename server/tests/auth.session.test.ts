import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { setupTestDb } from "./helpers";

setupTestDb();

const creds = { username: "andrei", password: "Secret1" };

describe("session lifecycle", () => {
  it("login returns the user and sets a session cookie", async () => {
    const app = createApp();
    await request(app).post("/api/auth/register").send(creds);
    const res = await request(app).post("/api/auth/login").send(creds);
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe("andrei");
    expect(res.headers["set-cookie"]?.[0]).toContain("HttpOnly");
  });

  it("rejects a wrong password and an unknown user identically", async () => {
    const app = createApp();
    await request(app).post("/api/auth/register").send(creds);
    const wrongPassword = await request(app).post("/api/auth/login").send({ ...creds, password: "Nope1x" });
    const unknownUser = await request(app).post("/api/auth/login").send({ username: "ghost", password: "Secret1" });
    for (const res of [wrongPassword, unknownUser]) {
      expect(res.status).toBe(401);
      expect(res.body.error).toEqual({ code: "INVALID_CREDENTIALS", message: "Invalid username or password" });
    }
  });

  it("me returns the logged-in user for a session cookie, 401 without one", async () => {
    const app = createApp();
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send(creds);
    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.username).toBe("andrei");

    const anonymous = await request(app).get("/api/auth/me");
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.error.code).toBe("UNAUTHORIZED");
  });

  it("logout destroys the session", async () => {
    const agent = request.agent(createApp());
    await agent.post("/api/auth/register").send(creds);
    const logout = await agent.post("/api/auth/logout");
    expect(logout.status).toBe(204);
    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(401);
  });
});
