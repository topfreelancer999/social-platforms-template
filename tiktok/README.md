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
- **For You / Following feed** (`/`, `/following`) — full-height vertical feed with CSS scroll-snap (one video per screen) and TikTok-style top tabs (LIVE · Following · For You · search)
  - The video in view autoplays (IntersectionObserver, ≥60% visible) and the rest pause and rewind; starts muted with a remembered mute toggle (`m`)
  - Tap to play/pause, double-tap to like with a heart burst, playback progress bar
  - Right action rail: avatar with one-tap follow, like, comments, favorites (bookmark), share (copy link / native share sheet) with counts, spinning sound disc
  - Bottom overlay: @username + verified badge, expandable caption with linked hashtags, sound name
  - Desktop: ↑/↓ (or `j`/`k`) and on-screen chevrons to move between videos, space to play/pause
  - Infinite loading with cursor pagination (`GET /api/feed/for-you?seed=&cursor=&limit=`, `GET /api/feed/following?cursor=&limit=`)
  - For You is a ranked mix: engagement (likes, comments, favorites, shares, views) × recency decay × per-session seed, with a pass that avoids the same creator twice in a row; excludes your own and blocked accounts
  - Following shows only creators you follow, newest first; the empty state suggests creators to follow
  - A view is counted after ~2s of on-screen playback (`POST /api/videos/:id/view`); shares are counted via `POST /api/videos/:id/share`
  - Demo user follows `sarah-dance`, `mike-funny` and `emma-travel`, so both tabs are populated
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
