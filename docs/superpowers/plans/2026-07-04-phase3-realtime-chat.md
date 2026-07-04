# Phase 3 — Real-Time Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The prototype's two-pane Messages page runs on real persistence and Socket.io — buddy search's "Start Chat" opens a live conversation whose messages persist in MongoDB and arrive in real time.

**Architecture:** The express-session middleware is extracted so the Express app and Socket.io share one instance — the Phase-1 httpOnly cookie authenticates socket handshakes. Sending is socket-only (`message:send` with an acknowledgement): validate → verify receiver → **persist** → push `message:new` to both users' rooms (`user:<username>`), so the sender's own tab appends from the broadcast (single append path; the ack only clears the input or shows an error). REST serves conversations (with unread counts), per-thread history (last 100), and read-marking. Spec: `docs/superpowers/specs/2026-07-04-phase3-realtime-chat-design.md`.

**Tech Stack:** existing stack + `socket.io` ^4.8 (server) and `socket.io-client` ^4.8 (client).

## Global Constraints

- TypeScript `strict: true`; **zero `any`**. Sanctioned casts this phase, each with a comment: `socket.request as express.Request` (the session middleware ran via `io.engine.use`), and the existing patterns from Phases 1–2.
- Error vocabulary everywhere: REST envelope `{ error: { code, message } }`; socket acks `{ ok: true, message } | { ok: false, error: { code, message } }`.
- Message identity: `sender`/`receiver` are **usernames**. History cap: last **100** per conversation, ascending, documented constant. Unread semantics: `status: "unread" | "read"`; opening a conversation marks incoming read.
- Ported `Messages.scss` byte-identical; ported JSX preserves prototype classNames (`chatPage`, `conversationList`, `unreadIndicator`, `chatContainer`, `receiverHeader`, `messagesWrapper`, `messagesList`, `messagesForm`, `message sender|receiver`, `shortTimestamp`, `senderImage`, `receiverImage`) and the empty-state header "Go back and find a buddy". Message text renders as plain text (native emoji; no react-emoji).
- All commands run from repo root `c:\Users\andre\Desktop\sports-match` in Git Bash; commit after every task with the exact message given.
- Baseline (HEAD `2022a0f`): shared 14 / server 27 / client 10 = 51 tests, all green; suites must stay green throughout.

---

### Task 1: Shared chat contract

**Files:**
- Create: `shared/src/chat.ts`
- Modify: `shared/src/index.ts` (re-export)
- Test: `shared/src/chat.test.ts`

**Interfaces:**
- Consumes: `z` from zod.
- Produces (from `@sports-match/shared`; Tasks 3–6 import these):
  - `sendMessageInputSchema`, `SendMessageInput { receiver: string; text: string }`
  - `messageStatusSchema`, `MessageStatus = "unread" | "read"`
  - `publicMessageSchema`, `PublicMessage { id, sender, receiver, text, timestamp (ISO string), status: MessageStatus }`
  - `conversationSchema`, `Conversation { username, image, lastMessageAt (ISO string), unreadCount }`
  - `MessageSendAck = { ok: true; message: PublicMessage } | { ok: false; error: { code: string; message: string } }`
  - `SOCKET_EVENT_MESSAGE_SEND = "message:send"`, `SOCKET_EVENT_MESSAGE_NEW = "message:new"`

- [ ] **Step 1: Write the failing test `shared/src/chat.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import {
  conversationSchema,
  publicMessageSchema,
  sendMessageInputSchema,
  SOCKET_EVENT_MESSAGE_NEW,
  SOCKET_EVENT_MESSAGE_SEND,
} from "./chat";

describe("sendMessageInputSchema", () => {
  it("accepts a valid message and trims the text", () => {
    const result = sendMessageInputSchema.safeParse({ receiver: "anna", text: "  Hi there  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.text).toBe("Hi there");
    }
  });

  it("rejects empty and whitespace-only text with the exact message", () => {
    for (const text of ["", "   "]) {
      const result = sendMessageInputSchema.safeParse({ receiver: "anna", text });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Message cannot be empty");
      }
    }
  });

  it("rejects text over 1000 characters", () => {
    const result = sendMessageInputSchema.safeParse({ receiver: "anna", text: "x".repeat(1001) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Message is too long");
    }
  });
});

describe("chat shapes and event names", () => {
  it("describes the public message shape", () => {
    const message = {
      id: "abc",
      sender: "anna",
      receiver: "bob",
      text: "Hi",
      timestamp: new Date().toISOString(),
      status: "unread" as const,
    };
    expect(publicMessageSchema.safeParse(message).success).toBe(true);
    expect(publicMessageSchema.safeParse({ ...message, status: "seen" }).success).toBe(false);
  });

  it("describes the conversation shape and pins the event names", () => {
    const conversation = { username: "anna", image: "", lastMessageAt: new Date().toISOString(), unreadCount: 0 };
    expect(conversationSchema.safeParse(conversation).success).toBe(true);
    expect(conversationSchema.safeParse({ ...conversation, unreadCount: -1 }).success).toBe(false);
    expect(SOCKET_EVENT_MESSAGE_SEND).toBe("message:send");
    expect(SOCKET_EVENT_MESSAGE_NEW).toBe("message:new");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -w shared`
Expected: FAIL — `Cannot find module './chat'`.

- [ ] **Step 3: Write `shared/src/chat.ts`**

```ts
import { z } from "zod";

export const sendMessageInputSchema = z.object({
  receiver: z.string().min(1, "Receiver is required"),
  text: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(1000, "Message is too long"),
});
export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

export const messageStatusSchema = z.enum(["unread", "read"]);
export type MessageStatus = z.infer<typeof messageStatusSchema>;

export const publicMessageSchema = z.object({
  id: z.string(),
  sender: z.string(),
  receiver: z.string(),
  text: z.string(),
  timestamp: z.string(),
  status: messageStatusSchema,
});
export type PublicMessage = z.infer<typeof publicMessageSchema>;

export const conversationSchema = z.object({
  username: z.string(),
  image: z.string(),
  lastMessageAt: z.string(),
  unreadCount: z.number().int().min(0),
});
export type Conversation = z.infer<typeof conversationSchema>;

export type MessageSendAck =
  | { ok: true; message: PublicMessage }
  | { ok: false; error: { code: string; message: string } };

// Client and server import the same strings — they cannot drift.
export const SOCKET_EVENT_MESSAGE_SEND = "message:send";
export const SOCKET_EVENT_MESSAGE_NEW = "message:new";
```

And add to `shared/src/index.ts`:
```ts
export * from "./chat";
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test -w shared` → PASS (19 tests). `npm run build -w shared` → clean.

- [ ] **Step 5: Commit**

```bash
git add shared
git commit -m "feat(shared): chat message and conversation contract with socket event names"
```

---

### Task 2: Session extraction + HTTP server rework

**Files:**
- Create: `server/src/session.ts`
- Modify: `server/src/app.ts` (session moves out; optional parameter), `server/src/index.ts` (http.createServer)

**Interfaces:**
- Consumes: existing `config`.
- Produces: `createSessionMiddleware(): express.RequestHandler`; `createApp(sessionMiddleware?: express.RequestHandler)` — defaults to creating its own, so every existing test and call site keeps working unchanged; `index.ts` now builds `http.createServer(app)` (Task 4 attaches the socket to it).
- No behavior change — this is a pure refactor; all 27 server tests must stay green with zero test edits.

- [ ] **Step 1: Write `server/src/session.ts`**

```ts
import MongoStore from "connect-mongo";
import type express from "express";
import session from "express-session";
import type { MongoClient } from "mongodb";
import mongoose from "mongoose";
import { config } from "./config";

/**
 * One session middleware shared by the Express app and the Socket.io
 * handshake (io.engine.use) — the same httpOnly cookie authenticates both.
 */
export function createSessionMiddleware(): express.RequestHandler {
  return session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      // mongoose bundles its own mongodb driver; the cast bridges the two packages' nominal types.
      client: mongoose.connection.getClient() as unknown as MongoClient,
    }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: config.isProduction,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  });
}
```

- [ ] **Step 2: Rewrite `server/src/app.ts`** (full file)

```ts
import express from "express";
import { errorHandler, notFoundHandler } from "./errors";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { createSessionMiddleware } from "./session";

export function createApp(
  sessionMiddleware: express.RequestHandler = createSessionMiddleware(),
): express.Express {
  const app = express();
  app.set("trust proxy", 1);
  // 5mb: profile images travel as data URLs for now (see spec).
  app.use(express.json({ limit: "5mb" }));
  app.use(sessionMiddleware);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 3: Rewrite `server/src/index.ts`** (full file — http server; socket attaches in Task 4)

```ts
import http from "node:http";
import { createApp } from "./app";
import { config } from "./config";
import { connectDb } from "./db";
import { createSessionMiddleware } from "./session";

async function main(): Promise<void> {
  if (!config.mongoUrl) {
    throw new Error("MONGO_URL missing — copy server/.env.example to server/.env and fill it in, or use `npm run dev:memory`");
  }
  if (config.isProduction && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is required in production");
  }
  await connectDb(config.mongoUrl);
  const sessionMiddleware = createSessionMiddleware();
  const app = createApp(sessionMiddleware);
  const server = http.createServer(app);
  server.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 4: Verify the refactor is invisible**

Run: `npm test -w server` → PASS, 27 tests, zero test-file edits. `npm run build -w server` → clean. Then a smoke check that the entry still boots: `npm run dev:memory` in the background, `curl -s http://localhost:4000/api/health` → `{"status":"ok"}`, kill servers.

- [ ] **Step 5: Commit**

```bash
git add server
git commit -m "refactor(server): extract session middleware and http server for socket sharing"
```

---

### Task 3: Message model + REST /api/messages

**Files:**
- Create: `server/src/models/Message.ts`, `server/src/routes/messages.ts`
- Modify: `server/src/app.ts` (mount router)
- Test: `server/tests/messages.rest.test.ts`

**Interfaces:**
- Consumes: `PublicMessage`, `Conversation` from shared; `requireAuth`, `AppError`, `User`, `setupTestDb` from earlier phases.
- Produces: `Message` model (`MessageFields { sender: string; receiver: string; text: string; timestamp: Date; status: "unread" | "read" }`), `toPublicMessage(doc): PublicMessage`, `HISTORY_CAP = 100`; routes `GET /api/messages/conversations` → `{ conversations }`, `GET /api/messages/with/:username` → `{ messages }` (last 100 ascending), `PATCH /api/messages/with/:username/read` → 204. Task 4's socket layer reuses `Message` + `toPublicMessage`.

- [ ] **Step 1: Write the failing test `server/tests/messages.rest.test.ts`**

```ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -w server`
Expected: FAIL — cannot find `../src/models/Message` / 404s.

- [ ] **Step 3: Write `server/src/models/Message.ts`**

```ts
import type { PublicMessage } from "@sports-match/shared";
import mongoose, { type HydratedDocument } from "mongoose";

export interface MessageFields {
  sender: string;
  receiver: string;
  text: string;
  timestamp: Date;
  status: "unread" | "read";
}

const messageSchema = new mongoose.Schema<MessageFields>({
  sender: { type: String, required: true },
  receiver: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, default: "unread" },
});
messageSchema.index({ sender: 1, receiver: 1, timestamp: 1 });

export const Message = mongoose.model<MessageFields>("Message", messageSchema);
export type MessageDoc = HydratedDocument<MessageFields>;

export function toPublicMessage(message: MessageDoc): PublicMessage {
  return {
    id: message.id as string,
    sender: message.sender,
    receiver: message.receiver,
    text: message.text,
    timestamp: message.timestamp.toISOString(),
    status: message.status,
  };
}
```

- [ ] **Step 4: Write `server/src/routes/messages.ts`**

```ts
import type { Conversation } from "@sports-match/shared";
import { Router, type Request } from "express";
import { AppError } from "../errors";
import { requireAuth } from "../middleware/requireAuth";
import { Message, toPublicMessage } from "../models/Message";
import { User } from "../models/User";

export const messagesRouter = Router();

// Documented cap (see phase 3 spec): last 100 messages per thread, no pagination yet.
export const HISTORY_CAP = 100;

async function requireUsername(req: Request): Promise<string> {
  const user = await User.findById(req.session.userId);
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "You must be logged in");
  }
  return user.username;
}

messagesRouter.get("/conversations", requireAuth, async (req, res) => {
  const me = await requireUsername(req);
  const messages = await Message.find({ $or: [{ sender: me }, { receiver: me }] }).sort({ timestamp: -1 });

  const byCounterparty = new Map<string, { lastMessageAt: string; unreadCount: number }>();
  for (const message of messages) {
    const counterparty = message.sender === me ? message.receiver : message.sender;
    const entry = byCounterparty.get(counterparty) ?? {
      lastMessageAt: message.timestamp.toISOString(), // first hit is the newest (sorted desc)
      unreadCount: 0,
    };
    if (message.receiver === me && message.status === "unread") {
      entry.unreadCount += 1;
    }
    byCounterparty.set(counterparty, entry);
  }

  const usernames = [...byCounterparty.keys()];
  const users = await User.find({ username: { $in: usernames } });
  const imageByUsername = new Map(users.map((u) => [u.username, u.image]));

  const conversations: Conversation[] = usernames.map((username) => ({
    username,
    image: imageByUsername.get(username) ?? "",
    lastMessageAt: byCounterparty.get(username)!.lastMessageAt,
    unreadCount: byCounterparty.get(username)!.unreadCount,
  }));

  res.json({ conversations });
});

messagesRouter.get("/with/:username", requireAuth, async (req, res) => {
  const me = await requireUsername(req);
  const other = req.params.username;
  const newestFirst = await Message.find({
    $or: [
      { sender: me, receiver: other },
      { sender: other, receiver: me },
    ],
  })
    .sort({ timestamp: -1 })
    .limit(HISTORY_CAP);

  res.json({ messages: newestFirst.reverse().map(toPublicMessage) });
});

messagesRouter.patch("/with/:username/read", requireAuth, async (req, res) => {
  const me = await requireUsername(req);
  await Message.updateMany(
    { sender: req.params.username, receiver: me, status: "unread" },
    { $set: { status: "read" } },
  );
  res.status(204).end();
});
```

- [ ] **Step 5: Mount in `server/src/app.ts`**

Add the import and mount below `/api/users`:
```ts
import { messagesRouter } from "./routes/messages";
```
```ts
  app.use("/api/users", usersRouter);
  app.use("/api/messages", messagesRouter);
```

- [ ] **Step 6: Run tests**

Run: `npm test -w server` → PASS, 32 tests (27 + 5). `npm run build -w server` → clean.

- [ ] **Step 7: Commit**

```bash
git add server
git commit -m "feat(server): message model and rest endpoints for conversations, history, read-marking"
```

---

### Task 4: Socket layer — session-authenticated delivery

**Files:**
- Create: `server/src/socket.ts`
- Modify: `server/src/index.ts` (attach), `server/package.json` (add socket.io)
- Test: `server/tests/socket.chat.test.ts`

**Interfaces:**
- Consumes: `sendMessageInputSchema`, `MessageSendAck`, `PublicMessage`, `SOCKET_EVENT_MESSAGE_SEND`, `SOCKET_EVENT_MESSAGE_NEW` from shared; `createSessionMiddleware`/`createApp` (Task 2); `Message`, `toPublicMessage` (Task 3); `User`.
- Produces: `attachSocket(server: http.Server, sessionMiddleware: express.RequestHandler): SocketIOServer` — handshake rejects sessions without a user; each socket joins `user:<username>`; `message:send` validates → verifies receiver → persists → emits `message:new` to both rooms → acks. Task 6's client connects to this.

- [ ] **Step 1: Add the dependency**

In `server/package.json` dependencies add:
```json
    "socket.io": "^4.8.0",
```
Run `npm install` from root. Expected: success.

- [ ] **Step 2: Write the failing test `server/tests/socket.chat.test.ts`**

```ts
import type { AddressInfo } from "node:net";
import http from "node:http";
import {
  SOCKET_EVENT_MESSAGE_NEW,
  SOCKET_EVENT_MESSAGE_SEND,
  type MessageSendAck,
  type PublicMessage,
} from "@sports-match/shared";
import request from "supertest";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { Message } from "../src/models/Message";
import { createSessionMiddleware } from "../src/session";
import { attachSocket } from "../src/socket";
import { setupTestDb } from "./helpers";

setupTestDb();

interface ChatServer {
  url: string;
  app: ReturnType<typeof createApp>;
  close: () => Promise<void>;
}

const openSockets: ClientSocket[] = [];
let activeServer: ChatServer | null = null;

async function startChatServer(): Promise<ChatServer> {
  const sessionMiddleware = createSessionMiddleware();
  const app = createApp(sessionMiddleware);
  const server = http.createServer(app);
  const io = attachSocket(server, sessionMiddleware);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  const chatServer: ChatServer = {
    url: `http://localhost:${port}`,
    app,
    close: async () => {
      io.close();
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    },
  };
  activeServer = chatServer;
  return chatServer;
}

async function registerAndGetCookie(app: ReturnType<typeof createApp>, username: string): Promise<string> {
  const res = await request(app).post("/api/auth/register").send({ username, password: "Secret1" });
  return res.headers["set-cookie"]?.[0]?.split(";")[0] ?? "";
}

function connect(url: string, cookie?: string): ClientSocket {
  const socket = ioc(url, {
    transports: ["websocket"],
    reconnection: false,
    ...(cookie ? { extraHeaders: { Cookie: cookie } } : {}),
  });
  openSockets.push(socket);
  return socket;
}

function connected(socket: ClientSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once("connect", () => resolve());
    socket.once("connect_error", (err) => reject(err));
  });
}

afterEach(async () => {
  for (const socket of openSockets.splice(0)) {
    socket.disconnect();
  }
  if (activeServer) {
    await activeServer.close();
    activeServer = null;
  }
});

describe("socket chat", () => {
  it("rejects an anonymous handshake", async () => {
    const chat = await startChatServer();
    const socket = connect(chat.url);
    await expect(connected(socket)).rejects.toMatchObject({ message: "UNAUTHORIZED" });
  });

  it("persists then delivers a message to both users' rooms", async () => {
    const chat = await startChatServer();
    const annaCookie = await registerAndGetCookie(chat.app, "anna");
    const bobCookie = await registerAndGetCookie(chat.app, "bob");

    const anna = connect(chat.url, annaCookie);
    const bob = connect(chat.url, bobCookie);
    await Promise.all([connected(anna), connected(bob)]);

    const bobReceived = new Promise<PublicMessage>((resolve) =>
      bob.once(SOCKET_EVENT_MESSAGE_NEW, resolve),
    );
    const annaReceived = new Promise<PublicMessage>((resolve) =>
      anna.once(SOCKET_EVENT_MESSAGE_NEW, resolve),
    );

    const ack = await anna.emitWithAck(SOCKET_EVENT_MESSAGE_SEND, { receiver: "bob", text: "See you at the court!" }) as MessageSendAck;
    expect(ack.ok).toBe(true);

    const [toBob, toAnna] = await Promise.all([bobReceived, annaReceived]);
    expect(toBob.text).toBe("See you at the court!");
    expect(toBob.sender).toBe("anna");
    expect(toAnna.id).toBe(toBob.id);

    const saved = await Message.findOne({ sender: "anna", receiver: "bob" });
    expect(saved?.status).toBe("unread");
  });

  it("acks a typed validation error for empty text", async () => {
    const chat = await startChatServer();
    const annaCookie = await registerAndGetCookie(chat.app, "anna");
    const anna = connect(chat.url, annaCookie);
    await connected(anna);

    const ack = await anna.emitWithAck(SOCKET_EVENT_MESSAGE_SEND, { receiver: "bob", text: "   " }) as MessageSendAck;
    expect(ack).toEqual({ ok: false, error: { code: "VALIDATION_ERROR", message: "Message cannot be empty" } });
  });

  it("acks a typed error for an unknown receiver", async () => {
    const chat = await startChatServer();
    const annaCookie = await registerAndGetCookie(chat.app, "anna");
    const anna = connect(chat.url, annaCookie);
    await connected(anna);

    const ack = await anna.emitWithAck(SOCKET_EVENT_MESSAGE_SEND, { receiver: "ghost", text: "hello?" }) as MessageSendAck;
    expect(ack).toEqual({ ok: false, error: { code: "UNKNOWN_RECEIVER", message: "That user does not exist" } });
    expect(await Message.countDocuments()).toBe(0);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npm test -w server`
Expected: FAIL — cannot find `../src/socket`.

- [ ] **Step 4: Write `server/src/socket.ts`**

```ts
import type http from "node:http";
import {
  SOCKET_EVENT_MESSAGE_NEW,
  SOCKET_EVENT_MESSAGE_SEND,
  sendMessageInputSchema,
  type MessageSendAck,
} from "@sports-match/shared";
import type express from "express";
import { Server } from "socket.io";
import { Message, toPublicMessage } from "./models/Message";
import { User } from "./models/User";

interface SocketData {
  username: string;
}

export function attachSocket(
  server: http.Server,
  sessionMiddleware: express.RequestHandler,
): Server {
  const io = new Server(server);
  // The same session middleware the Express app uses runs on the socket
  // handshake request — the httpOnly cookie authenticates sockets too.
  io.engine.use(sessionMiddleware);

  io.use((socket, next) => {
    // The session middleware ran via io.engine.use, so the handshake
    // request carries a session; the cast bridges http.IncomingMessage
    // and express.Request nominal types.
    const req = socket.request as express.Request;
    const userId = req.session?.userId;
    if (!userId) {
      next(new Error("UNAUTHORIZED"));
      return;
    }
    User.findById(userId)
      .then((user) => {
        if (!user) {
          next(new Error("UNAUTHORIZED"));
          return;
        }
        (socket.data as SocketData).username = user.username;
        next();
      })
      .catch((err: unknown) => {
        next(err instanceof Error ? err : new Error("INTERNAL"));
      });
  });

  io.on("connection", (socket) => {
    const { username } = socket.data as SocketData;
    void socket.join(`user:${username}`);

    socket.on(SOCKET_EVENT_MESSAGE_SEND, async (payload: unknown, ack?: (response: MessageSendAck) => void) => {
      try {
        const result = sendMessageInputSchema.safeParse(payload);
        if (!result.success) {
          ack?.({ ok: false, error: { code: "VALIDATION_ERROR", message: result.error.issues[0]?.message ?? "Invalid input" } });
          return;
        }
        const { receiver, text } = result.data;
        const receiverUser = await User.findOne({ username: receiver });
        if (!receiverUser) {
          ack?.({ ok: false, error: { code: "UNKNOWN_RECEIVER", message: "That user does not exist" } });
          return;
        }
        // Persist first, push second — the worst failure mode is "late", never "lost".
        const saved = await Message.create({ sender: username, receiver, text });
        const publicMessage = toPublicMessage(saved);
        io.to(`user:${receiver}`).to(`user:${username}`).emit(SOCKET_EVENT_MESSAGE_NEW, publicMessage);
        ack?.({ ok: true, message: publicMessage });
      } catch (err: unknown) {
        console.error(err);
        ack?.({ ok: false, error: { code: "INTERNAL", message: "Something went wrong" } });
      }
    });
  });

  return io;
}
```

Note on `socket.data`: Socket.io types `data` loosely; the `as SocketData` casts (write in `io.use`, read in `connection`) are the sanctioned pattern here — two casts, one interface, no `any`.

- [ ] **Step 5: Attach in `server/src/index.ts`**

Add the import and one line after `http.createServer`:
```ts
import { attachSocket } from "./socket";
```
```ts
  const server = http.createServer(app);
  attachSocket(server, sessionMiddleware);
  server.listen(config.port, () => {
```

- [ ] **Step 6: Run tests**

Run: `npm test -w server` → PASS, 36 tests (32 + 4). `npm run build -w server` → clean.

- [ ] **Step 7: Commit**

```bash
git add server package-lock.json
git commit -m "feat(server): session-authenticated socket.io chat with persist-then-push delivery"
```

---

### Task 5: Client chat plumbing — API module, formatDate, socket dep, ws proxy

**Files:**
- Create: `client/src/api/messages.ts`, `client/src/pages/Messages/formatDate.ts`
- Modify: `client/package.json` (add socket.io-client), `client/vite.config.ts` (ws proxy)
- Test: `client/src/pages/Messages/formatDate.test.ts`

**Interfaces:**
- Consumes: `request` wrapper, `Conversation`, `PublicMessage` from shared.
- Produces (Task 6 imports these): `messagesApi.fetchConversations(): Promise<Conversation[]>`, `messagesApi.fetchThread(username: string): Promise<PublicMessage[]>`, `messagesApi.markThreadRead(username: string): Promise<void>`; `formatDate(date: string | Date): string` (prototype behavior: "MMM d, yyyy, " prefix only for non-today dates + 24h HH:mm).

- [ ] **Step 1: Add the dependency and proxy**

`client/package.json` dependencies add:
```json
    "socket.io-client": "^4.8.0",
```
`client/vite.config.ts` — replace the `server` block with:
```ts
  server: {
    port: 3000,
    proxy: {
      "/api": "http://localhost:4000",
      "/socket.io": { target: "http://localhost:4000", ws: true },
    },
  },
```
Run `npm install` from root.

- [ ] **Step 2: Write the failing test `client/src/pages/Messages/formatDate.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { formatDate } from "./formatDate";

describe("formatDate", () => {
  it("shows only the time for a message from today", () => {
    const today = new Date();
    today.setHours(14, 5, 0, 0);
    expect(formatDate(today)).toBe(
      today.toLocaleString("bg-BG", { hour: "2-digit", minute: "2-digit", hour12: false }),
    );
  });

  it("prefixes the date for a message from another day", () => {
    const other = new Date("2026-01-15T09:30:00");
    const result = formatDate(other);
    expect(result).toContain("Jan 15, 2026");
    expect(result).toContain(
      other.toLocaleString("bg-BG", { hour: "2-digit", minute: "2-digit", hour12: false }),
    );
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npm test -w client`
Expected: FAIL — `Cannot find module './formatDate'`.

- [ ] **Step 4: Write `client/src/pages/Messages/formatDate.ts`** (prototype logic, typed)

```ts
export function formatDate(date: string | Date): string {
  const currentDate = new Date();
  const messageDate = new Date(date);

  let dateString = "";
  if (
    currentDate.getDate() !== messageDate.getDate() ||
    currentDate.getMonth() !== messageDate.getMonth() ||
    currentDate.getFullYear() !== messageDate.getFullYear()
  ) {
    dateString =
      messageDate.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric" }) + ", ";
  }

  const timeString = messageDate.toLocaleString("bg-BG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return dateString + timeString;
}
```

- [ ] **Step 5: Write `client/src/api/messages.ts`**

```ts
import type { Conversation, PublicMessage } from "@sports-match/shared";
import { request } from "./http";

export async function fetchConversations(): Promise<Conversation[]> {
  const res = await request<{ conversations: Conversation[] }>("/api/messages/conversations");
  return res.conversations;
}

export async function fetchThread(username: string): Promise<PublicMessage[]> {
  const res = await request<{ messages: PublicMessage[] }>(
    `/api/messages/with/${encodeURIComponent(username)}`,
  );
  return res.messages;
}

export function markThreadRead(username: string): Promise<void> {
  return request<void>(`/api/messages/with/${encodeURIComponent(username)}/read`, { method: "PATCH" });
}
```

- [ ] **Step 6: Run tests and build**

Run: `npm test -w client` → PASS, 12 tests (10 + 2). `npm run build -w client` → clean.

- [ ] **Step 7: Commit**

```bash
git add client package-lock.json
git commit -m "feat(client): messages api module, formatDate util, socket.io-client and ws proxy"
```

---

### Task 6: Messages page port + route swap

**Files:**
- Port from prototype branch: `src/pages/Messages/Messages.scss` → `client/src/pages/Messages/Messages.scss` (byte-identical)
- Create: `client/src/pages/Messages/Messages.tsx`
- Modify: `client/src/App.tsx` (swap the `/messages` route)

**Interfaces:**
- Consumes: everything from Tasks 1–5; `useAuth().user`; `CustomAlert`; `user.png`.
- Produces: `/messages` renders the live page. Changes vs prototype (intentional, per spec): localStorage manager → REST + socket; polling loops gone; LoginModal dance gone (RequireAuth); plain-text message rendering (native emoji, no react-emoji); receiving a message in the OPEN thread marks it read immediately; `message:new` is the single append path.

- [ ] **Step 1: Port the stylesheet**

```bash
git checkout prototype -- src/pages/Messages/Messages.scss
mkdir -p client/src/pages/Messages
cp src/pages/Messages/Messages.scss client/src/pages/Messages/
rm -rf src
git add -A
```
Expected: `git status` shows only `client/src/pages/Messages/Messages.scss` added; no top-level `src/`.

- [ ] **Step 2: Write `client/src/pages/Messages/Messages.tsx`**

```tsx
import {
  SOCKET_EVENT_MESSAGE_NEW,
  SOCKET_EVENT_MESSAGE_SEND,
  type Conversation,
  type MessageSendAck,
  type PublicMessage,
} from "@sports-match/shared";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import * as messagesApi from "../../api/messages";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import { useAuth } from "../../context/AuthContext";
import userImage from "../../images/user.png";
import "../../sweetalert2-custom.scss";
import { formatDate } from "./formatDate";
import "./Messages.scss";

export default function MessagesPage() {
  const location = useLocation();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<PublicMessage[]>([]);
  const [currentReceiver, setCurrentReceiver] = useState(
    (location.state as { receiver?: string } | null)?.receiver ?? "",
  );
  const [error, setError] = useState("");
  const messageListRef = useRef<HTMLUListElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const currentReceiverRef = useRef(currentReceiver);
  currentReceiverRef.current = currentReceiver;

  const me = user?.username ?? "";

  const refreshConversations = () => {
    messagesApi
      .fetchConversations()
      .then(setConversations)
      .catch(() => setError("Could not load your chats. Please try again."));
  };

  // One socket for the page's lifetime; message:new is the single append path.
  useEffect(() => {
    const socket = io();
    socketRef.current = socket;
    socket.on(SOCKET_EVENT_MESSAGE_NEW, (message: PublicMessage) => {
      const openReceiver = currentReceiverRef.current;
      const belongsToOpenThread =
        (message.sender === openReceiver && message.receiver === me) ||
        (message.sender === me && message.receiver === openReceiver);
      if (belongsToOpenThread) {
        setMessages((previous) => [...previous, message]);
        if (message.receiver === me) {
          // You are looking at the thread — mark it read immediately.
          void messagesApi.markThreadRead(message.sender).then(refreshConversations);
          return;
        }
      }
      refreshConversations();
    });
    socket.on("connect_error", () => {
      setError("Live connection failed. Refresh the page to try again.");
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [me]);

  useEffect(() => {
    refreshConversations();
  }, []);

  useEffect(() => {
    if (!currentReceiver) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    messagesApi
      .fetchThread(currentReceiver)
      .then((thread) => {
        if (!cancelled) {
          setMessages(thread);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load this conversation. Please try again.");
        }
      });
    void messagesApi.markThreadRead(currentReceiver).then(refreshConversations);
    return () => {
      cancelled = true;
    };
  }, [currentReceiver]);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem("message") as HTMLInputElement;
    const text = input.value;
    socketRef.current?.emit(
      SOCKET_EVENT_MESSAGE_SEND,
      { receiver: currentReceiver, text },
      (ack: MessageSendAck) => {
        if (ack.ok) {
          form.reset();
          setError("");
        } else {
          setError(ack.error.message);
        }
      },
    );
  };

  const receiverImage = (username: string): string =>
    conversations.find((c) => c.username === username)?.image || userImage;

  return (
    <div className="chatPage">
      <div className="conversationList">
        <h1>Chats</h1>
        <ul>
          {conversations.map((conversation) => (
            <li key={conversation.username} onClick={() => setCurrentReceiver(conversation.username)}>
              <img
                src={conversation.image || userImage}
                alt={conversation.username}
                className="receiverImage"
              />
              {conversation.username}
              {conversation.unreadCount > 0 && <span className="unreadIndicator"></span>}
            </li>
          ))}
        </ul>
      </div>
      <div className="chatContainer">
        <div className="receiverHeader">
          <h1>{currentReceiver ? currentReceiver : "Go back and find a buddy"}</h1>
          {currentReceiver && (
            <img src={receiverImage(currentReceiver)} alt={currentReceiver} className="receiverImage" />
          )}
        </div>
        {error && <CustomAlert variant="danger" message={error} />}
        <div className="messagesWrapper">
          <ul className="messagesList" ref={messageListRef}>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                me={me}
                senderImage={receiverImage(message.sender)}
              />
            ))}
          </ul>
          <form className="messagesForm" onSubmit={handleSendMessage}>
            <input
              type="text"
              name="message"
              placeholder="Type a message..."
              autoComplete="off"
              disabled={!currentReceiver}
            />
            <button type="submit" disabled={!currentReceiver}>Send</button>
          </form>
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: PublicMessage;
  me: string;
  senderImage: string;
}

function MessageBubble({ message, me, senderImage }: MessageBubbleProps) {
  const isSentByMe = message.sender === me;
  return (
    <>
      <span className="shortTimestamp">{formatDate(message.timestamp)}</span>
      <li className={`message ${isSentByMe ? "sender" : "receiver"}`}>
        {!isSentByMe && (
          <div className="senderInfo">
            <img src={senderImage} alt={message.sender} className="senderImage" />
          </div>
        )}
        <span className="messageText">{message.text}</span>
      </li>
    </>
  );
}
```
(Note: the `as HTMLInputElement` on `form.elements.namedItem` and the `as { receiver?: string } | null` on location.state are the standard DOM/router narrowing casts already used elsewhere in the codebase.)

- [ ] **Step 3: Swap the route in `client/src/App.tsx`**

Add the import:
```tsx
import MessagesPage from "./pages/Messages/Messages";
```
Change
```tsx
          <Route path="/messages" element={<ComingSoon feature="Messages" />} />
```
to
```tsx
          <Route path="/messages" element={<MessagesPage />} />
```
(`ComingSoon` stays imported — Places still uses it.)

- [ ] **Step 4: Verify**

Run: `npm test -w client` → PASS (12). `npm run build -w client` → clean. Then `npm run dev:memory` in the background and verify the wiring: the page serves (`curl -s http://localhost:3000/messages | head -3` returns the SPA shell) and the socket endpoint answers through the proxy (`curl -s "http://localhost:3000/socket.io/?EIO=4&transport=polling"` returns an engine.io payload or an auth refusal — either proves proxy + server wiring; sending itself is socket-only and is exercised by Task 4's tests and Task 7's node script). Kill servers. Live two-browser behavior is the human click-through.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(client): live messages page over socket.io with conversations and unread state"
```

---

### Task 7: Final verification, README roadmap, push

**Files:**
- Modify: `README.md` (roadmap line 3)

- [ ] **Step 1: Update the README roadmap**

Change
```markdown
3. Real-time chat (Socket.io)
```
to
```markdown
3. ✅ Real-time chat (Socket.io)
```

- [ ] **Step 2: Full verification**

Run: `npm test` (expect shared 19 / server 36 / client 12 = 67, all green) and `npm run build` (all three clean).

- [ ] **Step 3: End-to-end socket flow (success criterion, API level)**

Run `npm run dev:memory` in the background; wait for boot. Using node (socket.io-client is installed) run this script via `node --input-type=module -e "..."` or a scratch file — register two users with curl first:
```bash
curl -s -c /tmp/p3a -H "Content-Type: application/json" -d '{"username":"anna","password":"Secret1"}' http://localhost:3000/api/auth/register
curl -s -c /tmp/p3b -H "Content-Type: application/json" -d '{"username":"bob","password":"Secret1"}' http://localhost:3000/api/auth/register
```
Extract each cookie (`grep connect.sid /tmp/p3a` etc.), then run a scratch Node script (e.g. `.superpowers/sdd/socket-check.mjs`, imports from `client/node_modules` or root `node_modules`):
```js
import { io } from "socket.io-client";

const [annaCookie, bobCookie] = process.argv.slice(2);
const url = "http://localhost:4000";
const anna = io(url, { transports: ["websocket"], extraHeaders: { Cookie: annaCookie } });
const bob = io(url, { transports: ["websocket"], extraHeaders: { Cookie: bobCookie } });

bob.on("message:new", (message) => {
  console.log("BOB RECEIVED:", message.text, "from", message.sender);
  anna.disconnect();
  bob.disconnect();
  process.exit(0);
});
anna.on("connect", () => {
  anna.emit("message:send", { receiver: "bob", text: "meet at 6?" }, (ack) => {
    console.log("ACK:", JSON.stringify(ack));
  });
});
setTimeout(() => {
  console.error("TIMEOUT — no delivery");
  process.exit(1);
}, 10000);
```
Run: `node .superpowers/sdd/socket-check.mjs "<annaCookie>" "<bobCookie>"`
Expected output: `ACK: {"ok":true,...}` then `BOB RECEIVED: meet at 6? from anna`. Then verify persistence via REST: `curl -s -b /tmp/p3b http://localhost:3000/api/messages/conversations` shows anna with `unreadCount` 0 or 1 (1 if bob never opened the thread) and `curl -s -b /tmp/p3b http://localhost:3000/api/messages/with/anna` returns the message. Kill servers; delete the scratch script.

- [ ] **Step 4: Commit and push**

```bash
git add README.md
git commit -m "feat: phase 3 complete — real-time chat over session-authenticated sockets"
git push
```

**Human click-through items (report, don't perform):** two browsers messaging live without refresh; unread dot appears when viewing a different conversation and clears on click; Start Chat from buddy search opens the thread; thread survives refresh; timestamps show date prefix only for older messages.

---

## Out of scope (deliberate, per spec)

- Typing indicators, read receipts beyond the unread dot, editing/deletion, group chats, navbar unread badge, push notifications, pagination beyond the 100 cap, emoji shortcode conversion, message search.
- Places (Phase 4).
