# Telegram Clone (React + Node.js + Redis)

Full-stack Telegram-style messenger with chats, groups, broadcast channels, contacts, search, profile, settings, reviews, and feedback.

## Quick start

```bash
cd d:\tasks\themes\telegram
copy server\.env.example server\.env
npm install
cd server
npx prisma generate
npx prisma db push
npm run db:seed
cd ..
npm run dev
```

| Service | URL |
|--------|-----|
| Web | http://localhost:5185 |
| API | http://localhost:3013 |
| Demo | `demo@telegram.local` / `password` |

Optional Redis: `docker compose up -d` (port **6392**).

## Features

| Area | Description |
|------|-------------|
| Auth | Register, login, JWT + refresh |
| Chats | 1-on-1 DMs with read state & Socket.io |
| Groups | Join/leave, linked group chat thread |
| Channels | Subscribe to broadcast post channels |
| Contacts | Add and browse contacts |
| Messaging | Real-time message delivery |
| Search | Users, channels, groups, messages |
| Profile | @username, online status, phone |
| Settings | Privacy, last seen, phone visibility |
| Reviews | Partner pages (Telegram Premium) |
| Feedback | App feedback form |
| Notifications | In-app notifications |
