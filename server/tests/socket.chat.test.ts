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
