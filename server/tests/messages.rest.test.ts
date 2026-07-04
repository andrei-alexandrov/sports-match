import type { Express } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { Message } from "../src/models/Message";
import { setupTestDb } from "./helpers";

setupTestDb();

async function createUser(
  app: Express,
  username: string,
  profile: { city?: string; image?: string } = {},
): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send({ username, password: "Secret1" });
  if (Object.keys(profile).length > 0) {
    await agent.patch("/api/users/me").send(profile);
  }
  return agent;
}

describe("GET /api/messages/conversations", () => {
  it("lists counterparties with unread counts and images, most recent first", async () => {
    const app = createApp();
    const mira = await createUser(app, "mira", {});
    await createUser(app, "anna", { image: "data:image/png;base64,QQ==" });
    await createUser(app, "bob", {});

    await Message.create({ sender: "anna", receiver: "mira", text: "hi from anna", timestamp: new Date("2026-07-01T10:00:00Z") });
    await Message.create({ sender: "anna", receiver: "mira", text: "again", timestamp: new Date("2026-07-01T11:00:00Z") });
    await Message.create({ sender: "mira", receiver: "bob", text: "hi bob", timestamp: new Date("2026-07-02T10:00:00Z") });

    const res = await mira.get("/api/messages/conversations");
    expect(res.status).toBe(200);
    expect(res.body.conversations).toEqual([
      { username: "bob", image: "", lastMessageAt: "2026-07-02T10:00:00.000Z", unreadCount: 0 },
      { username: "anna", image: "data:image/png;base64,QQ==", lastMessageAt: "2026-07-01T11:00:00.000Z", unreadCount: 2 },
    ]);
  });

  it("requires authentication", async () => {
    const res = await request(createApp()).get("/api/messages/conversations");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/messages/with/:username", () => {
  it("returns the thread ascending and caps at 100", async () => {
    const app = createApp();
    const mira = await createUser(app, "mira");
    await createUser(app, "anna");

    const docs = Array.from({ length: 101 }, (_, i) => ({
      sender: i % 2 === 0 ? "mira" : "anna",
      receiver: i % 2 === 0 ? "anna" : "mira",
      text: `message ${i}`,
      timestamp: new Date(Date.UTC(2026, 6, 1, 0, 0, i)),
    }));
    await Message.insertMany(docs);

    const res = await mira.get("/api/messages/with/anna");
    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(100);
    // The oldest message (index 0) fell off the cap; order is ascending.
    expect(res.body.messages[0].text).toBe("message 1");
    expect(res.body.messages[99].text).toBe("message 100");
  });

  it("does not leak other people's threads", async () => {
    const app = createApp();
    const mira = await createUser(app, "mira");
    await createUser(app, "anna");
    await createUser(app, "bob");
    await Message.create({ sender: "anna", receiver: "bob", text: "private", timestamp: new Date() });

    const res = await mira.get("/api/messages/with/anna");
    expect(res.body.messages).toEqual([]);
  });
});

describe("PATCH /api/messages/with/:username/read", () => {
  it("marks only incoming messages from that user as read", async () => {
    const app = createApp();
    const mira = await createUser(app, "mira");
    await createUser(app, "anna");
    await Message.create({ sender: "anna", receiver: "mira", text: "one", timestamp: new Date() });
    await Message.create({ sender: "mira", receiver: "anna", text: "two", timestamp: new Date() });

    const res = await mira.patch("/api/messages/with/anna/read");
    expect(res.status).toBe(204);

    const incoming = await Message.findOne({ sender: "anna", receiver: "mira" });
    const outgoing = await Message.findOne({ sender: "mira", receiver: "anna" });
    expect(incoming?.status).toBe("read");
    expect(outgoing?.status).toBe("unread");
  });
});
