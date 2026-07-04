import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach } from "vitest";

/** Boots an in-memory MongoDB for the suite; wipes data between tests. */
export function setupTestDb(): void {
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  });

  beforeEach(async () => {
    await mongoose.connection.db!.dropDatabase();
  });

  afterAll(async () => {
    // connect-mongo's MongoStore.create() kicks off a background TTL-index
    // creation that isn't awaited anywhere; every createApp() call in a test
    // spins up a fresh one. Disconnecting immediately races that in-flight
    // operation and surfaces as an unhandled MongoClientClosedError. This
    // grace period lets it settle before we tear the connection down.
    await new Promise((resolve) => setTimeout(resolve, 300));
    await mongoose.disconnect();
    await mongod.stop();
  });
}
