# Phase 3 — Real-Time Chat — Design

**Date:** 2026-07-04
**Status:** Approved by Andrei (all four sections approved individually)
**Parent spec:** `2026-07-04-fullstack-rebuild-design.md`. **Baseline:** Phase 2
complete at commit `ce74d8a` (51 tests: 14 shared / 27 server / 10 client).

## Goal

Port the prototype's two-pane Messages page onto real persistence and
Socket.io delivery: buddy search's "Start Chat" opens a live conversation,
messages persist in MongoDB, and recipients see them in real time.
Completes the "chat" step of the core loop (profile → match → chat → meet).

## Decisions made

| Decision | Choice | Why |
|---|---|---|
| Socket auth | Reuse the express-session middleware for the Socket.io handshake | One auth system; the Phase-1 httpOnly cookie authenticates sockets too; anonymous handshakes rejected |
| Delivery | Persist-then-push (store-and-forward) | Worst failure mode is "late," never "lost"; offline users find unread messages on return |
| Send path | Socket-only (`message:send` with acknowledgement) | One real-time path; ack carries typed errors for UI feedback. REST handles reads |
| Identity in messages | Usernames (unique) for sender/receiver | Parity with prototype and the whole client's vocabulary (`state.receiver`); revisit if renaming ever allowed |
| Emoji | Native Unicode only; drop react-emoji | Modern browsers render emoji natively; avoids an unmaintained 2016 dependency. `:smile:` shortcodes stay literal text (intentional change) |
| History cap | Last 100 messages per conversation, ascending; no pagination UI | YAGNI at current scale; documented cap like search's 50 |
| Unread | Message `status: "unread" \| "read"`; opening a conversation marks incoming read | Prototype parity (sidebar dots + click-to-read) |
| Rooms | Each socket joins room `user:<username>` | Multi-device delivery for free (all of a user's sockets get every message) |

## Section 1 — Shared contract

Added to `@sports-match/shared`:

- `sendMessageInputSchema = { receiver: string (min 1), text: string (trimmed, min 1 "Message cannot be empty", max 1000 "Message is too long") }`, type `SendMessageInput`.
- `publicMessageSchema` / `PublicMessage = { id, sender, receiver, text, timestamp (ISO string), status: "unread" | "read" }`.
- `conversationSchema` / `Conversation = { username, image, lastMessageAt (ISO string), unreadCount (int ≥ 0) }`.
- Socket event name constants: `SOCKET_EVENT_MESSAGE_SEND = "message:send"`, `SOCKET_EVENT_MESSAGE_NEW = "message:new"` — client and server import the same strings.

## Section 2 — Server

- **Session extraction:** the `session(...)` middleware moves out of
  `createApp()` into `server/src/session.ts` (`createSessionMiddleware()`);
  the express app and Socket.io (`io.engine.use(...)`) share one instance.
- **Socket layer** (`server/src/socket.ts`, `attachSocket(httpServer)`):
  handshake middleware rejects sockets without `session.userId` and resolves
  the user's username; each socket joins `user:<username>`. On
  `message:send`: validate with `sendMessageInputSchema`; verify the
  receiver exists (typed ack error otherwise); persist the Message; emit
  `message:new` with the saved `PublicMessage` to both `user:<receiver>`
  and `user:<sender>` rooms; ack `{ ok: true, message }`. Validation or
  unknown-receiver failures ack `{ ok: false, error: { code, message } }`
  (same envelope vocabulary as REST).
- **Message model** (`server/src/models/Message.ts`): `sender`, `receiver`,
  `text`, `timestamp` (default now), `status` (default `"unread"`), with a
  compound index on `(sender, receiver, timestamp)`.
- **REST** (mounted `/api/messages`, all `requireAuth`):
  - `GET /api/messages/conversations` → `{ conversations: Conversation[] }`
    — distinct counterparties with `lastMessageAt`, `unreadCount` (incoming
    unread), and the counterparty's profile image, sorted by `lastMessageAt`
    descending.
  - `GET /api/messages/with/:username` → `{ messages: PublicMessage[] }` —
    the last 100 between the two users, ascending (documented cap).
  - `PATCH /api/messages/with/:username/read` → 204 — marks incoming
    messages from `:username` as read.
- `server/src/index.ts` becomes `http.createServer(app)` +
  `attachSocket(server)` + `server.listen(...)`.
- Note: conversation payloads include profile images as data URLs — same
  recorded tech debt as buddy search (thumbnails when real upload lands).

## Section 3 — Client

- New dependency `socket.io-client`; Vite dev proxy gains a `/socket.io`
  entry with `ws: true`.
- **Messages page** ported to `client/src/pages/Messages/Messages.tsx` with
  the prototype's exact layout and classNames (`chatPage`,
  `conversationList`, `unreadIndicator`, `chatContainer`, `receiverHeader`,
  `messagesWrapper`, `messagesList`, `messagesForm`, bubble classes
  `message sender|receiver`, `shortTimestamp`, `senderImage`/
  `receiverImage`); `Messages.scss` ported byte-identical. The empty-state
  header text "Go back and find a buddy" is preserved.
- Data flow: conversations and per-receiver history via REST on mount /
  receiver change; opening a conversation PATCHes read; a socket connects on
  page mount (cookie authenticates it) and `message:new` appends to the open
  thread or bumps the sidebar unread state; send emits `message:send` and
  surfaces ack errors via CustomAlert. **`message:new` is the single append
  path** — the sender's own tab appends when its room broadcast arrives; the
  ack only clears the input on success or shows the error (no double-append,
  and every device renders the same thread). The prototype's 2-second polling
  loops are gone.
- `formatDate` ported as a tested util (date shown only for non-today
  messages + HH:mm).
- "Start Chat" wiring: `state.receiver` selects the thread (may be empty);
  the first message creates the conversation. Route `/messages` swaps from
  ComingSoon to the real page (ComingSoon remains for `/places`).
- Message text renders as plain text (native emoji).

## Section 4 — Testing & success criteria

- **Server:** socket tests with `socket.io-client` against a real HTTP
  server on an ephemeral port, authenticating with a session cookie obtained
  through supertest: anonymous handshake rejected; A→B send persists and
  delivers to both clients; invalid text and unknown receiver return typed
  ack errors. REST tests: conversations aggregation with unread counts and
  ordering; history cap (101 messages → 100) and ascending order;
  read-marking; 401s.
- **Client:** `formatDate` unit test; page behavior is human-verified.
- **Success criterion** (dev:memory, two browsers): A starts a chat from
  buddy search and sends → B's open Messages page shows it live without
  refresh (unread dot if B is viewing another conversation) → B replies →
  both threads survive refresh.

## Out of scope (deliberate)

- Typing indicators, delivery/read receipts in the UI beyond the unread dot,
  message editing/deletion, group chats, global navbar unread badge, push
  notifications, pagination beyond the 100 cap, emoji shortcode conversion,
  message search.
- Places (Phase 4).
