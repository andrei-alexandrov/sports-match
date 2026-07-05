import type { Express } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { Event } from "../src/models/Event";
import { setupTestDb } from "./helpers";

setupTestDb();

async function registeredAgent(app: Express, username: string): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send({ username, password: "Secret1" });
  return agent;
}

function futureIso(hours = 2): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

async function createSocial(host: ReturnType<typeof request.agent>, capacity: number): Promise<string> {
  const res = await host.post("/api/events").send({
    title: "Evening run",
    sport: "running",
    type: "social",
    locationText: "Южен парк",
    startsAt: futureIso(),
    durationMinutes: 60,
    capacity,
  });
  return res.body.event.id as string;
}

describe("event membership", () => {
  it("joins an open event and reports the new participant list", async () => {
    const app = createApp();
    const host = await registeredAgent(app, "mira");
    const bob = await registeredAgent(app, "bob");
    const id = await createSocial(host, 3);
    const res = await bob.post(`/api/events/${id}/join`);
    expect(res.status).toBe(200);
    expect(res.body.event.participants).toEqual(["mira", "bob"]);
  });

  it("rejects a second join with ALREADY_JOINED", async () => {
    const app = createApp();
    const host = await registeredAgent(app, "mira");
    const bob = await registeredAgent(app, "bob");
    const id = await createSocial(host, 3);
    await bob.post(`/api/events/${id}/join`);
    const res = await bob.post(`/api/events/${id}/join`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ALREADY_JOINED");
  });

  it("rejects joining a full event with EVENT_FULL", async () => {
    const app = createApp();
    const host = await registeredAgent(app, "mira");
    const bob = await registeredAgent(app, "bob");
    const zed = await registeredAgent(app, "zed");
    const id = await createSocial(host, 2);
    await bob.post(`/api/events/${id}/join`);
    const res = await zed.post(`/api/events/${id}/join`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EVENT_FULL");
  });

  it("never oversells the last slot under concurrent joins", async () => {
    const app = createApp();
    const host = await registeredAgent(app, "mira");
    const id = await createSocial(host, 4); // host takes 1, leaving 3
    const joiners = await Promise.all(
      // registerInputSchema requires >= 3 chars starting with a letter, so "u1".."u5" (2 chars)
      // would fail registration validation before ever reaching /join — use "usr1".."usr5" instead.
      ["usr1", "usr2", "usr3", "usr4", "usr5"].map((name) => registeredAgent(app, name)),
    );
    const results = await Promise.all(joiners.map((agent) => agent.post(`/api/events/${id}/join`)));
    const wins = results.filter((r) => r.status === 200).length;
    expect(wins).toBe(3);
    const doc = await Event.findById(id);
    expect(doc!.participants).toHaveLength(4);
  });

  it("rejects joining a started event with EVENT_STARTED", async () => {
    const app = createApp();
    const bob = await registeredAgent(app, "bob");
    const doc = await Event.create({
      title: "Started run", sport: "running", type: "social", description: null,
      host: "mira", hostTrainer: false, placeId: null, placeName: null, placeAddress: null,
      locationText: "парк", startsAt: new Date(Date.now() - 60 * 1000), durationMinutes: 60,
      capacity: 5, participants: ["mira"], price: null, status: "active",
    });
    const res = await bob.post(`/api/events/${doc.id as string}/join`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EVENT_STARTED");
  });

  it("returns 404 for an unknown event id", async () => {
    const app = createApp();
    const bob = await registeredAgent(app, "bob");
    const res = await bob.post("/api/events/64b000000000000000000000/join");
    expect(res.status).toBe(404);
  });

  it("lets a participant leave, but not the social host", async () => {
    const app = createApp();
    const host = await registeredAgent(app, "mira");
    const bob = await registeredAgent(app, "bob");
    const id = await createSocial(host, 3);
    await bob.post(`/api/events/${id}/join`);
    const left = await bob.post(`/api/events/${id}/leave`);
    expect(left.status).toBe(200);
    expect(left.body.event.participants).toEqual(["mira"]);
    const notJoined = await bob.post(`/api/events/${id}/leave`);
    expect(notJoined.status).toBe(409);
    expect(notJoined.body.error.code).toBe("NOT_JOINED");
    const hostLeave = await host.post(`/api/events/${id}/leave`);
    expect(hostLeave.status).toBe(409);
    expect(hostLeave.body.error.code).toBe("HOST_CANNOT_LEAVE");
  });

  it("cancel is host-only, soft, and blocks joining", async () => {
    const app = createApp();
    const host = await registeredAgent(app, "mira");
    const bob = await registeredAgent(app, "bob");
    const id = await createSocial(host, 3);
    const notHost = await bob.post(`/api/events/${id}/cancel`);
    expect(notHost.status).toBe(403);
    const cancelled = await host.post(`/api/events/${id}/cancel`);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.event.status).toBe("cancelled");
    const again = await host.post(`/api/events/${id}/cancel`);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("EVENT_CANCELLED");
    const join = await bob.post(`/api/events/${id}/join`);
    expect(join.status).toBe(409);
    expect(join.body.error.code).toBe("EVENT_CANCELLED");
  });

  it("requires authentication on all membership routes", async () => {
    const app = createApp();
    for (const path of ["join", "leave", "cancel"]) {
      const res = await request(app).post(`/api/events/64b000000000000000000000/${path}`);
      expect(res.status).toBe(401);
    }
  });
});
