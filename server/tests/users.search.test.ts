import type { Express } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { setupTestDb } from "./helpers";

setupTestDb();

async function createUser(
  app: Express,
  username: string,
  profile: { city?: string; activities?: string[] },
): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send({ username, password: "Secret1" });
  await agent.patch("/api/users/me").send(profile);
  return agent;
}

describe("GET /api/users/search", () => {
  it("filters by activity, excludes the requester, and sorts by username", async () => {
    const app = createApp();
    const me = await createUser(app, "mira", { city: "Sofia", activities: ["tennis"] });
    await createUser(app, "bob", { city: "Sofia", activities: ["tennis"] });
    await createUser(app, "anna", { city: "Plovdiv", activities: ["tennis", "yoga"] });
    await createUser(app, "cara", { city: "Sofia", activities: ["yoga"] });

    const res = await me.get("/api/users/search?activity=tennis");
    expect(res.status).toBe(200);
    expect(res.body.users.map((u: { username: string }) => u.username)).toEqual(["anna", "bob"]);
  });

  it("matches city case-insensitively", async () => {
    const app = createApp();
    const me = await createUser(app, "mira", {});
    await createUser(app, "bob", { city: "Sofia" });
    await createUser(app, "anna", { city: "Plovdiv" });

    const res = await me.get("/api/users/search?city=sofia");
    expect(res.status).toBe(200);
    expect(res.body.users.map((u: { username: string }) => u.username)).toEqual(["bob"]);
  });

  it("combines activity and city with AND", async () => {
    const app = createApp();
    const me = await createUser(app, "mira", {});
    await createUser(app, "bob", { city: "Sofia", activities: ["tennis"] });
    await createUser(app, "anna", { city: "Plovdiv", activities: ["tennis"] });
    await createUser(app, "cara", { city: "Sofia", activities: ["yoga"] });

    const res = await me.get("/api/users/search?activity=tennis&city=Sofia");
    expect(res.body.users.map((u: { username: string }) => u.username)).toEqual(["bob"]);
  });

  it("returns all other users when no filters are given", async () => {
    const app = createApp();
    const me = await createUser(app, "mira", {});
    await createUser(app, "bob", {});
    await createUser(app, "anna", {});

    const res = await me.get("/api/users/search");
    expect(res.body.users.map((u: { username: string }) => u.username)).toEqual(["anna", "bob"]);
  });

  it("treats a regex-special city literally", async () => {
    const app = createApp();
    const me = await createUser(app, "mira", {});
    await createUser(app, "bob", { city: "Sofia" });

    const res = await me.get(`/api/users/search?city=${encodeURIComponent(".*")}`);
    expect(res.status).toBe(200);
    expect(res.body.users).toEqual([]);
  });

  it("rejects an unknown activity key with 400", async () => {
    const app = createApp();
    const me = await createUser(app, "mira", {});
    const res = await me.get("/api/users/search?activity=quidditch");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("requires authentication", async () => {
    const res = await request(createApp()).get("/api/users/search");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});
