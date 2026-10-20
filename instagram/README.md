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
- Private accounts & follow requests: following a private account sends a request
  (button shows **Requested**, tap again to cancel); non-followers see only the header,
  counts and bio. Posts, post links, likes/comments, feed/explore/search/reels results,
  stories and followers/following lists are enforced server-side (`403 { message }`).
  Activity shows **Follow requests (N)** with Confirm / Delete, the requester is notified
  on accept, and the header badge updates live over Socket.io. Settings → Account privacy
  toggles private/public (going public auto-approves pending requests); owners can remove
  followers. Demo `alex.photo` is private with 3 pending requests; try `nina.private`
  (locked), `leo.film` (private, followed) and `maya.studio` (Requested).

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
