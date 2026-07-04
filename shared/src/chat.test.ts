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
