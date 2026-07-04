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
          void messagesApi
            .markThreadRead(message.sender)
            .then(refreshConversations)
            .catch(() => {
              // Non-blocking: if read-marking fails, the unread dot simply
              // persists and self-heals the next time the thread is opened.
            });
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
    void messagesApi
      .markThreadRead(currentReceiver)
      .then(refreshConversations)
      .catch(() => {
        // Non-blocking: if read-marking fails, the unread dot simply
        // persists and self-heals the next time the thread is opened.
      });
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
    socketRef.current?.timeout(5000).emit(
      SOCKET_EVENT_MESSAGE_SEND,
      { receiver: currentReceiver, text },
      (timeoutErr: Error | null, ack?: MessageSendAck) => {
        if (timeoutErr || !ack) {
          setError("The message could not be sent. Check your connection and try again.");
          return;
        }
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
