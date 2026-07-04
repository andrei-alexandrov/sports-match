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
