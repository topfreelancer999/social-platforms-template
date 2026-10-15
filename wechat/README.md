# WeChat Clone (React + Node.js + Redis)

Full-stack WeChat-style platform with chats, Moments (朋友圈), Official Accounts (公众号), and social features.

## Quick start

```bash
cd d:\tasks\themes\wechat
copy server\.env.example server\.env
npm install
cd server
npx prisma generate
npx prisma db push
npm run db:seed
cd ..
npm run dev
```

- App: http://localhost:5181  
- API: http://localhost:3009  

**Demo:** `demo@wechat.local` / `password`

## WeChat features

- **Chats** — 1:1 and group messaging with read receipts (Socket.io + optional Redis)
- **Moments** — social feed with likes and comments
- **Official Accounts** — follow channels and read broadcast posts (post channel)
- **Discover** — shortcuts to Moments, channels, search, communities
- **Contacts** — start new chats and groups
- **Me** — profile, settings, WeChat ID

## Social parity

- Login / register, profiles, settings
- Communities (join groups), search
- Notifications, feedback, partner pages + reviews, events

## Ports

| Service | Port |
|---------|------|
| API | 3009 |
| Client | 5181 |
| Postgres (Docker) | 5441 |
| Redis (Docker) | 6388 |
