# X Clone (React + Node.js + Redis)

A full-stack Twitter/X-style social platform with tweets, follows, communities, DMs, search, trending hashtags, page reviews, feedback, and settings.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS 4, TanStack Query, Zustand, Socket.io-client |
| Backend | Node.js, Express 5, TypeScript, Prisma, Socket.io |
| Database | SQLite (local dev) or PostgreSQL 16 (Docker) |
| Cache / realtime | Redis 7 (optional; in-memory refresh tokens when unset) |

## Prerequisites

- Node.js 20+
- **Default:** no Docker — SQLite at `server/dev.db`

## Quick start

```bash
cd d:\tasks\themes\twitter
copy server\.env.example server\.env
npm install
cd server
npx prisma generate
npx prisma db push
npm run db:seed
cd ..
npm run dev
```

- Frontend: http://localhost:5174  
- API: http://localhost:3002  

### Demo login

| Email | Password |
|-------|----------|
| `demo@x.local` | `password` |

## Features

- **Auth** — Register, login, JWT + refresh
- **Home** — For You / Following feeds, compose tweets (280 chars), likes, retweets
- **Profile** — Banner, bio, follow, tweet timeline
- **Follows** — Suggestions, following list
- **Communities** — Create, join, community feed
- **Explore** — Search people, tweets, communities, pages, hashtags
- **Trending** — Hashtag sidebar + channel pages
- **DMs** — Threads + Socket.io
- **Notifications** — Likes, follows, messages
- **Pages & reviews** — Business pages with ratings
- **Feedback, settings, events, reports**

## Ports (Docker optional)

| Service | Port |
|---------|------|
| API | 3002 |
| Client | 5174 |
| Postgres | 5434 |
| Redis | 6381 |

```bash
docker compose up -d
```

Then set `DATABASE_URL` and `REDIS_URL` in `server/.env` and switch `provider` in `prisma/schema.prisma` to `postgresql`.
