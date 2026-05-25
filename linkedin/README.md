# LinkedIn Clone (React)

A professional LinkedIn-style frontend built with React, TypeScript, Vite, Tailwind CSS, and a mock API (MSW + localStorage).

## Quick start

```bash
cd linkedin
npm install
npm run dev
```

Open http://localhost:5173

### With Go + Redis backend (optional)

1. Start the API (see [../linkedin-api/README.md](../linkedin-api/README.md)):

```bash
cd ../linkedin-api
docker compose up -d redis
go run ./cmd/server
```

2. Enable real API in the frontend:

```bash
cp .env.example .env   # sets VITE_USE_REAL_API=true
npm run dev
```

Vite proxies `/api` to `http://localhost:8080`. Without `.env`, MSW mock runs in the browser as before.

## Demo account

| Email | Password |
|-------|----------|
| `demo@linkedin.local` | `password` |

Or click **Sign in as Jane Doe (demo)** on the login page.

Other seed users also use password `password` (e.g. `john.smith@email.com`).

## Features

- **Auth** — Login, register, forgot password (mock)
- **Feed** — Create posts, reactions, comments, reposts, filters, infinite scroll
- **Profile** — View/edit profile, experience, education, skills
- **My Network** — Invitations, suggestions, connections
- **Search** — People, jobs, companies, posts, groups
- **Jobs** — List, detail, Easy Apply, save jobs, job alerts
- **Messaging** — Threads and chat
- **Notifications** — Center with read/unread
- **Companies** — Company pages with tabs
- **Groups** — Discover, join/leave, members
- **Learning** — Course catalog and progress
- **Settings** — Account, privacy, notifications, communications, general
- **Premium** — Marketing page (no payment)
- **Events** — RSVP (local state)
- **Ads** — Promoted posts in feed and right rail

## Tech stack

- React 19 + TypeScript + Vite
- React Router 7, TanStack Query, Zustand
- Tailwind CSS 4, lucide-react
- MSW 2 for mock REST API
- react-hook-form + zod

## Mock API → real backend

Replace `fetch` calls in `src/lib/api.ts` with your API base URL. MSW handlers in `src/mocks/handlers/` document the REST contract:

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register |
| GET | `/api/auth/me` | Current user |
| GET | `/api/feed` | Paginated feed |
| POST | `/api/posts` | Create post |
| GET | `/api/search` | Search |
| GET | `/api/jobs` | Jobs list |
| … | … | See handler files |

## Scripts

- `npm run dev` — Development server
- `npm run build` — Production build
- `npm run preview` — Preview production build

## Data persistence

Mock data is stored in `localStorage` under `linkedin-mock-db` and `linkedin-auth`. Clear site data to reset.
