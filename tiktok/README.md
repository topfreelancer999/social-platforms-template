# TikTok Clone (React + Node.js + Redis)

Short-form vertical video platform with For You feed, upload, follows, communities, creator channel, DMs, reviews, and full social parity.

## Quick start

```bash
cd d:\tasks\themes\tiktok
copy server\.env.example server\.env
npm install
cd server
npx prisma generate
npx prisma db push
npm run db:seed
cd ..
npm run dev
```

- App: http://localhost:5176  
- API: http://localhost:3004  

**Demo:** `demo@tiktok.local` / `password`

## Features

### TikTok
- For You / Following vertical video feeds (scroll-snap, autoplay)
- Upload video (URL + caption + hashtags + sound)
- Like, comment, bookmark, profile grid
- Discover search, trending hashtags, sounds

### Social parity
- Auth, creator **channel** (posts), **communities** (groups)
- Follows, inbox (Socket.io), notifications
- Settings, feedback, events, partner pages + reviews

## Ports

| Service | Port |
|---------|------|
| API | 3004 |
| Client | 5176 |
| Postgres | 5436 |
| Redis | 6383 |
