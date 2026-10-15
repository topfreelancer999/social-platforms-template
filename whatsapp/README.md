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
- Read receipts and delivery ticks (demo)
- Status updates (24h)
- Broadcast **Channels** (follow, posts)
- Contacts and new chat / new group

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
