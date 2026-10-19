# Airbnb Clone (React + Node.js + Redis)

A full-stack Airbnb-style marketplace with listings, bookings, host channel, communities, messaging, reviews, and all Facebook-parity social features.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS 4, TanStack Query, Zustand, Socket.io-client |
| Backend | Node.js, Express 5, TypeScript, Prisma, Socket.io |
| Database | SQLite (local dev) or PostgreSQL 16 (Docker) |
| Cache | Redis 7 (optional; in-memory refresh tokens when unset) |

## Quick start

```bash
cd d:\tasks\themes\airbnb
copy server\.env.example server\.env
npm install
cd server
npx prisma generate
npx prisma db push
npm run db:seed
cd ..
npm run dev
```

- Frontend: http://localhost:5175  
- API: http://localhost:3003  

### Demo login

| Email | Password |
|-------|----------|
| `demo@airbnb.local` | `password` |

## Features

### Airbnb core
- **Listings** — search, filters, detail, photos, amenities
- **Bookings** — reserve stays, trips (upcoming/past)
- **Availability calendar** — two-month date range picker on each listing (booked and blocked nights struck through, check-out allowed on the first taken night, min/max stay); hosts block or reopen nights with a private note, see reservations by guest and set trip length under **Host → Calendar** (`/host/calendar`). Bookings that overlap a reservation or blocked night are rejected server-side (`409`)
- **Wishlists** — save favorites
- **Host dashboard** — reservations, create listing
- **Reviews** — listing + partner page reviews

### Facebook parity
- **Auth** — register, login, JWT refresh
- **Host channel** — feed with posts, reactions, comments (`/feed`)
- **Profile** — edit, timeline
- **Friends** — requests, suggestions
- **Groups** — travel communities
- **Messaging** — Socket.io DMs
- **Search** — people, posts, groups, pages
- **Notifications, settings, feedback, events, reports**

## Ports (Docker optional)

| Service | Port |
|---------|------|
| API | 3003 |
| Client | 5175 |
| Postgres | 5435 |
| Redis | 6382 |
