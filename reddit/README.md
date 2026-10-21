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

- Home and subreddit feeds sorted Hot / New / Top / Controversial from real vote tallies
- Subreddits (communities) — join, browse, post
- Post detail with nested comments sorted Best / Top / New / Controversial / Old
- Up/downvotes on posts and comments — click again to clear, click the other arrow to switch (score moves by 2); orange-red upvote / periwinkle downvote, compact scores (1.2k), "Vote" at zero, upvote ratio on the post page; optimistic with rollback, live score updates over Socket.io
- Karma: post karma + comment karma (+ total) on profiles, earned only from other people's votes; your own posts and comments start with your upvote, which never counts as karma; updates live
- Profile tabs: Posts, Comments, and private Upvoted / Downvoted lists for your own profile
- Create post (title, body, image URL)
- Search (posts, subreddits, users, groups)

### Voting API

`PUT /api/posts/:id/vote` and `PUT /api/posts/comments/:id/vote` with `{ "value": 1 | -1 | 0 }` (auth required, idempotent, rate-limited per user) return `{ id, score, upvotes, downvotes, myVote }`. Scores and karma are denormalized and updated in the same transaction as the vote row; the seed rebuilds them from vote rows (`recountVotes()`), so every point is backed by a real vote (60 seeded "lurker" accounts only vote).

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
