# Facebook Clone (React + Node.js + PostgreSQL + Redis)

A full-stack Facebook-style social platform with news feed, profiles, friends, groups, messaging, search, page reviews, feedback, and settings.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS 4, TanStack Query, Zustand, Socket.io-client |
| Backend | Node.js, Express 5, TypeScript, Prisma, Socket.io |
| Database | SQLite (local dev) or PostgreSQL 16 (Docker) |
| Cache / realtime | Redis 7 (optional; in-memory refresh tokens when unset) |

## Prerequisites

- Node.js 20+
- **Default:** no Docker — SQLite file at `server/dev.db`
- **Optional:** Docker Desktop for Postgres + Redis (see `server/.env.example`)

## Quick start

### 1. Configure server

```bash
copy server\.env.example server\.env
```

Defaults use `DATABASE_URL="file:./dev.db"` and empty `REDIS_URL` (in-memory sessions).

For Docker instead:

```bash
docker compose up -d
```

Then set `DATABASE_URL` and `REDIS_URL` in `server/.env` per `.env.example` comments and change `provider` in `prisma/schema.prisma` to `postgresql`.

### 2. Install & migrate

```bash
npm install
cd server
npx prisma generate
npx prisma db push
npm run db:seed
```

### 3. Run app

From repo root:

```bash
npm run dev
```

- Frontend: http://localhost:5173  
- API: http://localhost:3001  

### Demo login

| Email | Password |
|-------|----------|
| `demo@facebook.local` | `password` |

## Features

- **Auth** — Register, login, JWT + refresh cookies
- **Feed** — Posts, 6 reactions, comments, share, filters (All / Friends / Groups)
- **Profile** — Cover, timeline, edit profile
- **Friends** — Requests, suggestions, unfriend, block (API)
- **Groups** — Create, join, group feed
- **Messaging** — Threads + Socket.io real-time
- **Search** — People, groups, posts, pages
- **Notifications** — Mark read, unread badges
- **Reviews** — Rate & review Pages (businesses)
- **Feedback** — Platform feedback form
- **Settings** — Account, privacy, notifications
- **Events** — RSVP to events
- **Stories** — UI placeholder on feed

## Project structure

```
facebook/
├── client/          # React SPA
├── server/          # Express API + Socket.io
│   └── prisma/      # Schema + seed
├── docker-compose.yml
└── package.json     # npm workspaces
```

## API

REST under `/api` — see [server/src/routes/index.ts](server/src/routes/index.ts).

Socket.io events: `message:send`, `message:new`, `typing`, `thread:join`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Client + server concurrently |
| `npm run db:seed` | Reseed database |
| `npm run db:studio` | Prisma Studio |

## Without Docker

Install PostgreSQL and Redis locally, update `server/.env`, then run migrate/seed as above.
