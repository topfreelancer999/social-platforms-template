# Discord Clone (React + Node.js + Redis)

Full-stack Discord-style platform with servers, text/voice channels, real-time chat, DMs, and social features.

## Quick start

```bash
cd d:\tasks\themes\discord
copy server\.env.example server\.env
npm install
cd server
npx prisma generate
npx prisma db push
npm run db:seed
cd ..
npm run dev
```

- App: http://localhost:5178  
- API: http://localhost:3006  

**Demo:** `demo@discord.local` / `password` (owns *Dev Hub*)

Other seeded accounts (same password): `sarah.k@email.com` (Moderator in Dev Hub — Manage Roles, but below Admin) and `mike.j@email.com` (plain Member — can't post in #announcements or see #mod-chat).

## Discord features

- Server list (left rail) with icons
- Text, announcement, and voice channels
- Real-time channel messages (Socket.io + optional Redis adapter)
- Member list with online status
- Discover & join servers, create server
- Search (servers, channels, users, messages, groups)
- Roles & permissions (Discord bitfield model):
  - Server Settings → Roles: create, rename, recolour (Discord swatches + custom), hoist, mentionable, grouped permission toggles, delete, drag or ↑/↓ to reorder the hierarchy, Manage Members
  - Server Settings → Members and the member popout: assign/remove roles below your highest role
  - Channel settings → Permissions: Private Channel toggle and per-role/member overwrites with ✗ / ⁄ / ✓ toggles
  - Discord's algorithm (owner → Administrator → @everyone + roles → channel overwrites) enforced server-side: hidden channels aren't listed or searchable, read-only channels reject messages (403) and show a disabled composer, role management respects the hierarchy
  - Member list grouped by hoisted roles; names coloured by highest coloured role in the list and chat
  - Live refresh via Socket.io (`roles:update`, `channels:update`, `members:update`)

## Social parity

- User profiles, edit profile & status
- Channel posts feed, communities (groups)
- Direct messaging, notifications, settings, feedback
- Partner pages + reviews, events

## Stack

| Layer | Tech |
|-------|------|
| Client | React, Vite, TanStack Query, Tailwind |
| Server | Node.js, Express 5, Prisma, SQLite |
| Realtime | Socket.io, Redis (optional) |

## Ports

| Service | Port |
|---------|------|
| API | 3006 |
| Client | 5178 |
| Postgres (Docker) | 5438 |
| Redis (Docker) | 6385 |

```bash
docker compose up -d   # optional Postgres + Redis
```
