// Local development without an Atlas account: boots a throwaway in-memory
// MongoDB, then starts the normal server against it. Data resets on restart.
import { MongoMemoryServer } from "mongodb-memory-server";

const mongod = await MongoMemoryServer.create();
process.env.MONGO_URL = mongod.getUri();
process.env.SESSION_SECRET ??= "dev-memory-secret";

await import("./index");
