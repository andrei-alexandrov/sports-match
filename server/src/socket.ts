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
