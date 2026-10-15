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

Moments privacy demo (all passwords `password`): `mike.j@email.com` only shows the last 3 days of Moments; `sarah.k@email.com` has posts visible only to her "Work" tag and one hidden from Alex; `lily.c@email.com` is not Alex's contact, so her likes/comments on Sarah's post are hidden from Alex. Alex hides David's Moments from his feed.

## WeChat features

- **Chats** — 1:1 and group messaging with read receipts (Socket.io + optional Redis)
- **Moments** — social feed with likes and comments; post composer, per-user Moments album and Moment detail page
- **Moments privacy** (enforced server-side in the feed, user albums, single-Moment fetch, likes/comments and search)
  - **Who can see** when publishing: Public (all friends), Private (only me), **Visible to** or **Don't share with** selected tags and/or contacts. Your own restricted posts show a lock / people icon with the audience.
  - **Moments visibility range** (Me → Settings → Privacy → Moments): All / Last 6 months / Last month / Last 3 days limits how far back friends can see your Moments.
  - Per-contact **Don't let them see my Moments** and **Hide their Moments** (contact profile, or Settings → Privacy → Moments).
  - **Likes and comments are shown only from mutual friends**: viewers see likes/comments from their own contacts plus their own and the author's; counts are filtered too.
  - Hidden Moments return `404` from `GET /api/moments/:id`, and cannot be liked or commented on.
- **Contacts & Tags** — contacts are mutual friends (add from a profile); Contacts → Tags creates labels such as Family / Colleagues and manages their members
- **Official Accounts** — follow channels and read broadcast posts (post channel)
- **Discover** — shortcuts to Moments, channels, search, communities
- **Contacts** — start new chats and groups, open a contact's profile
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
