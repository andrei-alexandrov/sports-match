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
    // spins up a fresh one. If we disconnect before that settles, the
    // in-flight operation rejects with MongoClientClosedError, which surfaces
    // as an unhandled rejection. Swallow exactly that error during teardown;
    // anything else still fails the run.
    const swallowStoreRace = (reason: unknown): void => {
      if (
        reason instanceof Error &&
        (reason.name === "MongoClientClosedError" ||
          reason.constructor.name === "MongoClientClosedError")
      ) {
        return;
      }
      throw reason;
    };
    process.on("unhandledRejection", swallowStoreRace);
    await mongoose.disconnect();
    await mongod.stop();
    // Listener intentionally left in place; it is scoped to this process and
    // the test process exits with the suite, so there is nothing to clean up.
  });
}
