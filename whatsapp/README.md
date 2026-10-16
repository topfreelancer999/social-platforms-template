# WhatsApp Clone (React + Node.js + Redis)

Full-stack WhatsApp-style messaging platform with chats, groups, status, channels, and social features.

## Quick start

```bash
cd d:\tasks\themes\whatsapp
copy server\.env.example server\.env
npm install
cd server
npx prisma generate
npx prisma db push
npm run db:seed
cd ..
npm run dev
```

- App: http://localhost:5180  
- API: http://localhost:3008  

**Demo:** `demo@whatsapp.local` / `password`

## WhatsApp features

- Chat list with unread badges
- 1:1 and group messaging (real-time via Socket.io)
- **Message status ticks**: clock while sending → ✓ sent → ✓✓ delivered (recipient's device connected or synced) → blue ✓✓ read (chat opened). Group ticks turn blue only once every member has read
- **Message info** on your own messages: per-recipient "Read by" / "Delivered to" with timestamps
- **Typing indicator**: "typing…" in the chat header and chat list ("Sarah is typing…" in groups), live over Socket.io
- **Online / last seen** in the chat header, updated live on connect and disconnect
- Privacy → **Read receipts** (off hides blue ticks both ways in 1:1 chats; groups always send them) and **Last seen & online** (hiding yours also hides everyone else's last seen from you)
- Status updates (24h)
- Broadcast **Channels** (follow, posts)
- Contacts and new chat / new group

### Realtime events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `message:new` | server → recipients | New message (refreshes chat + list) |
| `receipt:update` | server → sender | A message you sent was delivered or read |
| `typing` | both | `{ threadId, isTyping }`; relayed to the other participants with the typer's name |
| `presence:update` | server → chat partners | Someone came online, went offline or changed privacy |
| `thread:read` | client → server | Socket alternative to `POST /api/messages/threads/:id/read` |

REST: `POST /api/messages/threads/:id/read`, `GET /api/messages/:messageId/info` (sender only).

Seeded demo chats show every state: Sarah (blue ticks, one unread), Mike (delivered), Emma (read but receipts off → grey), David (single tick, last seen hidden), and *Weekend Trip* (mixed group receipts).

## Social parity

- User profiles (about, phone, last seen)
- Communities (groups join/leave)
- Search (contacts, messages, channels, groups)
- Notifications, settings, feedback
- Partner pages + reviews, events

## Ports

| Service | Port |
|---------|------|
| API | 3008 |
| Client | 5180 |
| Postgres (Docker) | 5440 |
| Redis (Docker) | 6387 |
