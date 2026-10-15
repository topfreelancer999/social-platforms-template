# Discord Clone (React + Node.js + Redis)

Full-stack Discord-style platform with servers, text/voice channels, real-time chat, DMs, and social features.

## Quick start

```bash
cd d:\tasks\themes\discord
copy server\.env.example server\.env
npm install
cd server
npx prisma generate
npx prisma db push
npm run db:seed
cd ..
npm run dev
```

- App: http://localhost:5178  
- API: http://localhost:3006  

**Demo:** `demo@discord.local` / `password`

## Discord features

- Server list (left rail) with icons
- Text, announcement, and voice channels
- Real-time channel messages (Socket.io + optional Redis adapter)
- Member list with online status
- Discover & join servers, create server
- Search (servers, channels, users, messages, groups)

## Social parity

- User profiles, edit profile & status
- Channel posts feed, communities (groups)
- Direct messaging, notifications, settings, feedback
- Partner pages + reviews, events

## Stack

| Layer | Tech |
|-------|------|
| Client | React, Vite, TanStack Query, Tailwind |
| Server | Node.js, Express 5, Prisma, SQLite |
| Realtime | Socket.io, Redis (optional) |

## Ports

| Service | Port |
|---------|------|
| API | 3006 |
| Client | 5178 |
| Postgres (Docker) | 5438 |
| Redis (Docker) | 6385 |

```bash
docker compose up -d   # optional Postgres + Redis
```
