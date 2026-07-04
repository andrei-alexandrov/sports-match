import type { ActivityKey } from "@sports-match/shared";
import type { Express } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { Place } from "../src/models/Place";
import { setupTestDb } from "./helpers";

setupTestDb();

async function loggedInAgent(app: Express): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send({ username: "mira", password: "Secret1" });
  return agent;
}

interface FixturePlace {
  name: string;
  sports: ActivityKey[];
  address?: string;
  lat: number;
  lng: number;
}

async function insertPlaces(fixtures: FixturePlace[]): Promise<void> {
  // $geoNear needs the 2dsphere index, and dropDatabase between tests
  // removes it — recreate before every fixture insert.
  await Place.createIndexes();
  await Place.insertMany(
    fixtures.map((f) => ({
      name: f.name,
      sports: f.sports,
      address: f.address ?? "ул. Тестова 1",
      city: "София",
      neighborhood: "Тест",
      phone: "0888 000 000",
      workingHours: "Понеделник - неделя: 06:00 - 23:00",
      site: null,
      image: null,
      location: { type: "Point", coordinates: [f.lng, f.lat] },
    })),
  );
}

describe("GET /api/places", () => {
  it("returns all places sorted by name, without distanceKm, when no filters are given", async () => {
    const app = createApp();
    const me = await loggedInAgent(app);
    await insertPlaces([
      { name: "Gamma", sports: ["tennis"], lat: 42.7, lng: 23.3 },
      { name: "Alpha", sports: ["bowling"], lat: 42.7, lng: 23.3 },
      { name: "Beta", sports: ["darts"], lat: 42.7, lng: 23.3 },
    ]);
    const res = await me.get("/api/places");
    expect(res.status).toBe(200);
    expect(res.body.places.map((p: { name: string }) => p.name)).toEqual(["Alpha", "Beta", "Gamma"]);
    expect(res.body.places[0].distanceKm).toBeUndefined();
    expect(res.body.places[0].lat).toBeCloseTo(42.7);
    expect(res.body.places[0].lng).toBeCloseTo(23.3);
  });

  it("filters by sport", async () => {
    const app = createApp();
    const me = await loggedInAgent(app);
    await insertPlaces([
      { name: "Корт", sports: ["tennis"], lat: 42.7, lng: 23.3 },
      { name: "Зала", sports: ["bowling"], lat: 42.7, lng: 23.3 },
    ]);
    const res = await me.get("/api/places?sport=tennis");
    expect(res.body.places.map((p: { name: string }) => p.name)).toEqual(["Корт"]);
  });

  it("finds a billiards hall under both snooker and pool", async () => {
    const app = createApp();
    const me = await loggedInAgent(app);
    await insertPlaces([{ name: "Билярд", sports: ["snooker", "pool"], lat: 42.7, lng: 23.3 }]);
    const snooker = await me.get("/api/places?sport=snooker");
    const pool = await me.get("/api/places?sport=pool");
    expect(snooker.body.places).toHaveLength(1);
    expect(pool.body.places).toHaveLength(1);
  });

  it("matches Cyrillic q against the name case-insensitively", async () => {
    const app = createApp();
    const me = await loggedInAgent(app);
    await insertPlaces([
      { name: "Бадминтон зала Люлин", sports: ["badminton"], lat: 42.7, lng: 23.3 },
      { name: "Тенис клуб", sports: ["tennis"], lat: 42.7, lng: 23.3 },
    ]);
    const res = await me.get(`/api/places?q=${encodeURIComponent("бадминтон")}`);
    expect(res.body.places.map((p: { name: string }) => p.name)).toEqual(["Бадминтон зала Люлин"]);
  });

  it("matches q against the address too", async () => {
    const app = createApp();
    const me = await loggedInAgent(app);
    await insertPlaces([
      { name: "Зала А", sports: ["darts"], address: "кв. Дружба, ул. Тестова 5", lat: 42.7, lng: 23.3 },
      { name: "Зала Б", sports: ["darts"], address: "ж.к. Люлин, ул. Тестова 6", lat: 42.7, lng: 23.3 },
    ]);
    const res = await me.get(`/api/places?q=${encodeURIComponent("дружба")}`);
    expect(res.body.places.map((p: { name: string }) => p.name)).toEqual(["Зала А"]);
  });

  it("combines sport and q with AND", async () => {
    const app = createApp();
    const me = await loggedInAgent(app);
    await insertPlaces([
      { name: "Тенис Дружба", sports: ["tennis"], lat: 42.7, lng: 23.3 },
      { name: "Тенис Люлин", sports: ["tennis"], lat: 42.7, lng: 23.3 },
      { name: "Дартс Дружба", sports: ["darts"], lat: 42.7, lng: 23.3 },
    ]);
    const res = await me.get(`/api/places?sport=tennis&q=${encodeURIComponent("Дружба")}`);
    expect(res.body.places.map((p: { name: string }) => p.name)).toEqual(["Тенис Дружба"]);
  });

  it("sorts by distance and reports ascending distanceKm when lat/lng are given", async () => {
    const app = createApp();
    const me = await loggedInAgent(app);
    await insertPlaces([
      { name: "Далече", sports: ["tennis"], lat: 42.267, lng: 23.606 },
      { name: "Близо", sports: ["tennis"], lat: 42.69, lng: 23.32 },
      { name: "Средно", sports: ["tennis"], lat: 42.656, lng: 23.377 },
    ]);
    const res = await me.get("/api/places?lat=42.6852&lng=23.319");
    expect(res.status).toBe(200);
    expect(res.body.places.map((p: { name: string }) => p.name)).toEqual(["Близо", "Средно", "Далече"]);
    const distances = res.body.places.map((p: { distanceKm: number }) => p.distanceKm);
    expect(distances[0]).toBeLessThan(2);
    expect(distances[2]).toBeGreaterThan(20);
    expect([...distances].sort((a: number, b: number) => a - b)).toEqual(distances);
  });

  it("applies the sport filter inside a near query", async () => {
    const app = createApp();
    const me = await loggedInAgent(app);
    await insertPlaces([
      { name: "Тенис близо", sports: ["tennis"], lat: 42.69, lng: 23.32 },
      { name: "Дартс още по-близо", sports: ["darts"], lat: 42.6852, lng: 23.319 },
    ]);
    const res = await me.get("/api/places?lat=42.6852&lng=23.319&sport=tennis");
    expect(res.body.places.map((p: { name: string }) => p.name)).toEqual(["Тенис близо"]);
  });

  it("combines q with a near query", async () => {
    const app = createApp();
    const me = await loggedInAgent(app);
    await insertPlaces([
      { name: "Зала Дружба", sports: ["tennis"], address: "кв. Дружба, ул. Тестова 5", lat: 42.69, lng: 23.32 },
      { name: "Зала Люлин", sports: ["tennis"], address: "ж.к. Люлин, ул. Тестова 6", lat: 42.6852, lng: 23.319 },
    ]);
    const res = await me.get(`/api/places?lat=42.6852&lng=23.319&q=${encodeURIComponent("дружба")}`);
    expect(res.status).toBe(200);
    expect(res.body.places.map((p: { name: string }) => p.name)).toEqual(["Зала Дружба"]);
    expect(res.body.places[0].distanceKm).toBeGreaterThan(0);
  });

  it("treats a regex-special q literally", async () => {
    const app = createApp();
    const me = await loggedInAgent(app);
    await insertPlaces([{ name: "Plain", sports: ["tennis"], lat: 42.7, lng: 23.3 }]);
    const res = await me.get(`/api/places?q=${encodeURIComponent(".*")}`);
    expect(res.status).toBe(200);
    expect(res.body.places).toEqual([]);
  });

  it("rejects an unknown sport key with 400", async () => {
    const app = createApp();
    const me = await loggedInAgent(app);
    const res = await me.get("/api/places?sport=quidditch");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects lat without lng with 400", async () => {
    const app = createApp();
    const me = await loggedInAgent(app);
    const res = await me.get("/api/places?lat=42.7");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("requires authentication", async () => {
    const res = await request(createApp()).get("/api/places");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("caps results at 100", async () => {
    const app = createApp();
    const me = await loggedInAgent(app);
    await insertPlaces(
      Array.from({ length: 101 }, (_, i) => ({
        name: `p${String(i).padStart(3, "0")}`,
        sports: ["tennis"] as ActivityKey[],
        lat: 42.7,
        lng: 23.3,
      })),
    );
    const res = await me.get("/api/places");
    expect(res.status).toBe(200);
    expect(res.body.places).toHaveLength(100);
  });
});
