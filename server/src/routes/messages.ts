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
