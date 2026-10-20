# LinkedIn API (Go + Redis)

REST API backend for the [LinkedIn React frontend](../linkedin). Implements the same `/api/*` contract as the frontend MSW mock layer, with seed data stored in Redis.

## Requirements

- Go 1.22+
- Redis 7+ (optional — falls back to in-memory if Redis is unavailable)

## Quick start

### 1. Start Redis (recommended)

```bash
docker compose up -d redis
set REDIS_ADDR=localhost:6379   # Windows
# export REDIS_ADDR=localhost:6379  # macOS/Linux
```

### 2. Run API

```bash
go run ./cmd/server
```

Without Redis, omit `REDIS_ADDR` — the API uses in-memory storage (resets on restart).

Server listens on **http://localhost:8080**

### 3. Connect frontend

In `../linkedin`:

```bash
cp .env.example .env
npm run dev
```

Set `VITE_USE_REAL_API=true` in `.env` so the app uses this API instead of MSW.

Vite proxies `/api` → `http://localhost:8080`.

## Docker (API + Redis)

```bash
docker compose up --build
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ADDR` | `:8080` | HTTP listen address |
| `REDIS_ADDR` | *(empty)* | Redis address; set to `localhost:6379` to use Redis. Empty = in-memory only |
| `REDIS_PASSWORD` | — | Redis password |
| `REDIS_DB` | `0` | Redis database index |

## Demo login

| Email | Password |
|-------|----------|
| `demo@linkedin.local` | `password` |

## Endpoints

All routes are under `/api` and match the frontend mock handlers:

- **Auth**: `POST /auth/login`, `POST /auth/register`, `GET /auth/me`
- **Feed**: `GET /feed`, `POST /posts`, reactions, comments, repost
- **Users**: `GET /users/{id}`, `PATCH /users/me` (ignores `skills`), connect, follow
- **Skills & endorsements** (`{id}` is an id, username or `me`):
  - `GET /users/{id}/skills` — skills for the viewer (`endorsedByMe`, up to 3 endorser previews, colleague highlight) plus `isOwner` / `canEndorse`
  - `POST /users/{id}/skills` `{ name }` — owner only; 400 empty / >80 chars / >50 skills, 409 duplicate (case-insensitive)
  - `PATCH /users/{id}/skills/{skillId}` `{ pinned }` — owner only; max 3 top skills
  - `DELETE /users/{id}/skills/{skillId}` — owner only
  - `GET /users/{id}/skills/{skillId}/endorsers` — full endorser list (viewer first, then most recent)
  - `POST|DELETE /users/{id}/skills/{skillId}/endorse` — 400 own skill, 403 not a 1st-degree connection, 409 already / not endorsed; endorsing notifies the owner (`skill_endorsement`)
- **Network**: `GET /network`, invitations accept/ignore
- **Search**: `GET /search?q=&type=`
- **Jobs**: list, detail, apply, save, alerts
- **Messages**: threads CRUD
- **Notifications**: list, mark read
- **Companies**, **Groups**, **Courses**, **Settings**, **Events**

### Utilities

- `GET /health` — health check
- `POST /admin/reset` — reset DB to seed data

## Data model

The full mock database is stored as one JSON document in Redis key `linkedin:db` (same shape as frontend `initialSeed`). On first boot, data is loaded from embedded `internal/store/seed.json`.

### Refresh seed from frontend

```bash
make seed-export
```

Exports from `../linkedin/src/mocks/seed` and copies into `internal/store/seed.json`.

If Redis already holds `linkedin:db` from before skill endorsements existed, run `POST /admin/reset` to load the new seed (skills seeded with `endorserIds`).

## Tests

```bash
go test ./...
```

Handler tests run the real router against the in-memory store (no Redis needed).

## Project layout

```
linkedin-api/
├── cmd/server/          # Entry point
├── internal/
│   ├── config/
│   ├── handlers/        # HTTP handlers (chi router)
│   ├── middleware/      # CORS, auth
│   ├── models/
│   ├── service/         # Enrichment helpers
│   └── store/           # Redis + embedded seed
├── data/seed.json       # Source seed (export target)
└── docker-compose.yml
```

## Auth

Send `Authorization: Bearer <token>` on protected routes. Token is returned from login/register and stored in the DB `sessions` map.
