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
- **Home** — For You / Following feeds, compose tweets (280 chars), likes
- **Repost & quote posts** — The repost icon on every post opens a menu with **Repost / Undo repost** and **Quote**. Reposts are one per user per post, update the count optimistically and turn the icon green. Reposts show in followers' timelines and on the reposter's profile under a "<Name> reposted" header; an original appears only once per timeline. **Quote** opens a composer with a preview of the quoted post. The published quote is its own post (you can like, reply to and repost it) and embeds a card that links to the original, or shows "This post is unavailable" if the original was deleted. The post page shows Reposts / Quotes / Likes counts, and **Quotes** opens `/tweet/:id/quotes`. The original author gets a notification for each repost and quote.
  - API: `POST|DELETE /api/tweets/:id/repost`, `POST /api/tweets` with `quoteTweetId`, `GET /api/tweets/:id/quotes?page=`. Timeline items carry `repostedBy`, `entryId`, `quoteTweet`, `quoteUnavailable` and `quoteCount`.
- **Threads** — In the home composer and the **Post** modal (side nav button, or the floating button on mobile), **+** adds another post to the thread. Each post has its own 280-character counter and an **×** to remove it, and a line joins the avatars. **Post all** publishes the whole thread in one transaction, in order. Each post is a reply to the previous one by the same author. A thread needs 2–25 posts, and each must be non-empty and at most 280 characters. If any post is invalid, nothing is created. Timelines show the first post with a connecting line and a **Show this thread** link. The post page shows earlier thread posts above the post and the author's continuation, connected by lines, before other replies. On your own posts, **Add another post** at the end of the thread appends more posts later. Only the author can extend a thread, and a thread is capped at 25 posts. Replying to your own post also continues your thread.
  - API: `POST /api/tweets/thread` `{ posts: [{ content }] }`, `POST /api/tweets/:id/thread` (append, author only), `GET /api/tweets/:id/thread`. `GET /api/tweets/:id` returns `threadBefore` / `threadAfter`. Posts carry `threadRootId` and `threadLength`.
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
