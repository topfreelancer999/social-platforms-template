# Instagram Clone (React + Node.js + Redis)

Full-stack Instagram-style platform with feed, stories, reels, profiles, and social features.

## Quick start

```bash
cd d:\tasks\themes\instagram
copy server\.env.example server\.env
npm install
cd server
npx prisma generate
npx prisma db push
npm run db:seed
cd ..
npm run dev
```

- App: http://localhost:5179  
- API: http://localhost:3007  

**Demo:** `demo@instagram.local` / `password`

## Instagram features

- Home feed (following) with stories bar
- Explore grid & posts
- Create post, reel, or story (image URL)
- Reels viewer
- Profile grid, follow/unfollow, stats
- Search users, posts, hashtags, groups

## Social parity

- Communities (groups), channel posts in groups
- Direct messaging (Socket.io)
- Notifications, settings, feedback
- Partner pages + reviews, events

## Ports

| Service | Port |
|---------|------|
| API | 3007 |
| Client | 5179 |
| Postgres (Docker) | 5439 |
| Redis (Docker) | 6386 |

```bash
docker compose up -d
```
