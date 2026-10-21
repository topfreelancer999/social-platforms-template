# Snapchat Clone (React + Node.js + Redis)

Full-stack Snapchat-style demo with stories, snaps, friends, discover channels, chat, groups, search, profile, settings, reviews, and feedback.

## Stack

- **Client:** React 19, Vite, Tailwind, React Query, Socket.io
- **Server:** Express 5, Prisma, SQLite
- **Redis (optional):** refresh tokens + Socket.io adapter

## Quick start

```bash
cd d:\tasks\themes\snapchat
copy server\.env.example server\.env
npm install
cd server && npx prisma generate && npx prisma db push && npm run db:seed
cd .. && npm run dev
```

- **Web:** http://localhost:5183  
- **API:** http://localhost:3011  
- **Demo:** `demo@snapchat.local` / `password`

## Features

| Area | Description |
|------|-------------|
| Auth | Register, login, JWT + cookies, refresh |
| Stories | 24h friend stories, story rings, viewer tracking |
| Camera | Send SNAP / STORY / SPOTLIGHT (preset images demo) |
| Spotlight | Public short-form feed |
| Discover | Subscribe to post channels |
| Friends | Add, accept requests, list |
| Chat | DMs with Socket.io real-time |
| Snaps & Snapstreaks | Send photo / colored text Snaps to friends (view-once, opened from the Chat list with New Snap / Delivered / Opened / Received statuses). 🔥 + count once both friends snapped each other 3 days in a row, ⌛ when ≤ 4h remain, 💯 on day 100; Friendship Profile shows the streak and its start date. Rules: `server/src/lib/streaks.ts` |
| Groups | Join public/private groups |
| Search | Users, channels, groups, snaps |
| Profile | Snap score, bitmoji, edit |
| Settings | Privacy, story privacy, notifications |
| Reviews | Partner pages (e.g. Snapchat+) |
| Feedback | Submit app feedback |
| Map | Placeholder Snap Map UI |

## Docker (optional)

```bash
docker compose up -d
```

Redis: `6390`, Postgres (if used): `5443`
