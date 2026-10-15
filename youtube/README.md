# YouTube Clone (React + Node.js + Redis)

Full-stack YouTube-style platform with video watch, upload, subscriptions, playlists, and social features.

## Quick start

```bash
cd d:\tasks\themes\youtube
copy server\.env.example server\.env
npm install
cd server
npx prisma generate
npx prisma db push
npm run db:seed
cd ..
npm run dev
```

- App: http://localhost:5177  
- API: http://localhost:3005  

**Demo:** `demo@youtube.local` / `password`

## YouTube features

- Home feed, categories, trending
- Watch page (player, like, comments, related videos)
- Subscribe to channels
- YouTube Studio upload (video URL)
- Subscriptions feed, playlists
- Search (videos, channels, communities)

## Social parity (Facebook-style)

- Channel posts feed, communities (groups)
- Messaging, notifications, settings, feedback
- Partner pages + reviews, events

## Ports

| Service | Port |
|---------|------|
| API | 3005 |
| Client | 5177 |
| Postgres | 5437 |
| Redis | 6384 |
