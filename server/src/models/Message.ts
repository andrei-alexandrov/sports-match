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
  status: { type: String, enum: ["unread", "read"], default: "unread" },
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
