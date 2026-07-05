import {
  SOCKET_EVENT_MESSAGE_NEW,
  SOCKET_EVENT_MESSAGE_SEND,
  type Conversation,
  type MessageSendAck,
  type PublicMessage,
} from "@sports-match/shared";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import * as messagesApi from "../../api/messages";
import CustomAlert from "../../components/CustomAlert/CustomAlert";
import Radar from "../../components/Orbit/Radar";
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

  const findBuddiesEmptyState = (
    <>
      <Radar size={90} />
      <p>Find a buddy to start chatting</p>
      <Link to="/buddySearch">Find buddies</Link>
    </>
  );

  return (
    <div className={currentReceiver ? "chatPage chatPage--thread" : "chatPage"}>
      {error && <CustomAlert variant="danger" message={error} />}
      <aside className="chatPage__list">
        <h2 className="chatPage__listTitle">Chats</h2>
        {conversations.length === 0
          ? <div className="chatPage__listEmpty">{findBuddiesEmptyState}</div>
          : conversations.map((conversation) => (
              <button
                type="button"
                key={conversation.username}
                className={
                  conversation.username === currentReceiver ? "chatItem chatItem--active" : "chatItem"
                }
                onClick={() => setCurrentReceiver(conversation.username)}
              >
                <img className="chatItem__avatar" src={conversation.image || userImage} alt="" />
                <span className="chatItem__body">
                  <span className="chatItem__name">{conversation.username}</span>
                </span>
                {conversation.unreadCount > 0 && (
                  <span className="chatItem__unread" aria-label="Unread messages" />
                )}
              </button>
            ))}
      </aside>

      <section className="chatPage__thread">
        {!currentReceiver ? (
          <div className="chatPage__threadEmpty">{findBuddiesEmptyState}</div>
        ) : (
          <>
            <header className="chatPage__header">
              <button
                type="button"
                className="chatPage__back"
                aria-label="Back to chats"
                onClick={() => setCurrentReceiver("")}
              >
                ‹
              </button>
              <h3 className="chatPage__receiver">{currentReceiver}</h3>
            </header>
            <ul className="chatPage__messages" ref={messageListRef}>
              {messages.map((message) => (
                <li
                  key={message.id}
                  className={message.sender === me ? "bubble bubble--sent" : "bubble bubble--received"}
                >
                  <p className="bubble__text">{message.text}</p>
                  <span className="bubble__time">{formatDate(message.timestamp)}</span>
                </li>
              ))}
            </ul>
            <form className="chatPage__composer" onSubmit={handleSendMessage}>
              <input
                className="chatPage__input"
                type="text"
                name="message"
                placeholder="Type a message..."
                autoComplete="off"
              />
              <button type="submit" className="chatPage__send">
                Send ↑
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
