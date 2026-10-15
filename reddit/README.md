# Reddit Clone (React + Node.js + Redis)

Full-stack Reddit-style platform with subreddits, voting, comments, messaging, and social features.

## Quick start

```bash
cd d:\tasks\themes\reddit
copy server\.env.example server\.env
npm install
cd server
npx prisma generate
npx prisma db push
npm run db:seed
cd ..
npm run dev
```

- App: http://localhost:5182  
- API: http://localhost:3010  

**Demo:** `demo@reddit.local` / `password`

## Reddit features

- Home feed (hot / new / top) with upvote & downvote
- Subreddits (communities) — join, browse, post
- Post detail with nested comments and voting
- Create post (title, body, image URL)
- User profiles with karma
- Search (posts, subreddits, users, groups)

## Social parity

- Login / register (JWT + refresh, optional Redis)
- Direct messaging (Socket.io)
- Join groups (extra communities)
- Notifications, settings, feedback
- Partner pages + reviews, events

## Ports

| Service | Port |
|---------|------|
| API | 3010 |
| Client | 5182 |
| Postgres (Docker) | 5442 |
| Redis (Docker) | 6389 |
