import type { Express } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { Event } from "../src/models/Event";
import { seedPlaces } from "../src/seed/places";
import { Place } from "../src/models/Place";
import { setupTestDb } from "./helpers";

setupTestDb();

async function registeredAgent(app: Express, username: string, trainer = false): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send({ username, password: "Secret1" });
  if (trainer) {
    await agent.patch("/api/users/me").send({ trainer: true });
  }
  return agent;
}

function futureIso(hours = 2): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function socialInput() {
  return {
    title: "Evening run",
    sport: "running",
    type: "social",
    locationText: "Южен парк, входа",
    startsAt: futureIso(),
    durationMinutes: 60,
    capacity: 5,
  };
}

describe("POST /api/events", () => {
  it("creates a social event and auto-joins the host", async () => {
    const app = createApp();
    const me = await registeredAgent(app, "mira");
    const res = await me.post("/api/events").send(socialInput());
    expect(res.status).toBe(201);
    expect(res.body.event.host).toBe("mira");
    expect(res.body.event.participants).toEqual(["mira"]);
    expect(res.body.event.type).toBe("social");
    expect(res.body.event.place).toBeNull();
    expect(res.body.event.locationText).toBe("Южен парк, входа");
  });

  it("lets a trainer create a training event with a price at a catalogue place", async () => {
    const app = createApp();
    const coach = await registeredAgent(app, "coach", true);
    await seedPlaces();
    const place = await Place.findOne({ name: "Тенис клуб Бояна" });
    const res = await coach.post("/api/events").send({
      title: "Tennis fundamentals",
      sport: "tennis",
      type: "training",
      placeId: place!.id as string,
      startsAt: futureIso(),
      durationMinutes: 90,
      capacity: 8,
      price: "15 lv",
    });
    expect(res.status).toBe(201);
    expect(res.body.event.hostTrainer).toBe(true);
    expect(res.body.event.participants).toEqual([]);
    expect(res.body.event.place.name).toBe("Тенис клуб Бояна");
    expect(res.body.event.price).toBe("15 lv");
  });

  it("rejects a training event from a non-trainer with 403", async () => {
    const app = createApp();
    const me = await registeredAgent(app, "mira");
    const res = await me.post("/api/events").send({ ...socialInput(), type: "training" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("rejects an unknown placeId with 400", async () => {
    const app = createApp();
    const me = await registeredAgent(app, "mira");
    const res = await me.post("/api/events").send({ ...socialInput(), placeId: "64b000000000000000000000", locationText: undefined });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("requires authentication", async () => {
    const res = await request(createApp()).post("/api/events").send(socialInput());
    expect(res.status).toBe(401);
  });
});

describe("GET /api/events", () => {
  it("lists upcoming events ascending and filters by type and sport", async () => {
    const app = createApp();
    const me = await registeredAgent(app, "mira");
    const coach = await registeredAgent(app, "coach", true);
    await me.post("/api/events").send({ ...socialInput(), title: "Later run", startsAt: futureIso(5) });
    await me.post("/api/events").send({ ...socialInput(), title: "Sooner run", startsAt: futureIso(1) });
    await coach.post("/api/events").send({
      title: "Tennis class", sport: "tennis", type: "training", locationText: "Зала 1",
      startsAt: futureIso(3), durationMinutes: 60, capacity: 6, price: "10 lv",
    });

    const all = await me.get("/api/events");
    expect(all.body.events.map((e: { title: string }) => e.title)).toEqual(["Sooner run", "Tennis class", "Later run"]);

    const training = await me.get("/api/events?type=training");
    expect(training.body.events).toHaveLength(1);

    const running = await me.get("/api/events?sport=running");
    expect(running.body.events).toHaveLength(2);
  });

  it("hides past events", async () => {
    const app = createApp();
    const me = await registeredAgent(app, "mira");
    await Event.create({
      title: "Yesterday run", sport: "running", type: "social", description: null,
      host: "ghost", hostTrainer: false, placeId: null, placeName: null, placeAddress: null,
      locationText: "парк", startsAt: new Date(Date.now() - 60 * 60 * 1000), durationMinutes: 60,
      capacity: 5, participants: ["ghost"], price: null, status: "active",
    });
    const res = await me.get("/api/events");
    expect(res.body.events).toEqual([]);
  });

  // enabled in the membership task
  it.skip("shows cancelled events only to their host and participants", async () => {
    const app = createApp();
    const host = await registeredAgent(app, "mira");
    const joiner = await registeredAgent(app, "bob");
    const stranger = await registeredAgent(app, "zed");
    const created = await host.post("/api/events").send(socialInput());
    const id = created.body.event.id as string;
    await joiner.post(`/api/events/${id}/join`);
    await host.post(`/api/events/${id}/cancel`);

    expect((await host.get("/api/events")).body.events).toHaveLength(1);
    expect((await joiner.get("/api/events")).body.events).toHaveLength(1);
    expect((await joiner.get("/api/events")).body.events[0].status).toBe("cancelled");
    expect((await stranger.get("/api/events")).body.events).toEqual([]);
  });

  it("rejects an unknown type filter with 400", async () => {
    const app = createApp();
    const me = await registeredAgent(app, "mira");
    const res = await me.get("/api/events?type=party");
    expect(res.status).toBe(400);
  });
});
