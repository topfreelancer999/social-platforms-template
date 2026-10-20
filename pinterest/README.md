# Pinterest Clone (React + Node.js + Redis)

Full-stack Pinterest-style app: pins, boards, saves, follows, post channels, messaging, groups, search, profile, settings, reviews, and feedback.

## Quick start

```bash
cd d:\tasks\themes\pinterest
copy server\.env.example server\.env
npm install
cd server
npx prisma generate
npx prisma db push
npm run db:seed
cd ..
npm run dev
```

| Service | URL |
|--------|-----|
| Web | http://localhost:5184 |
| API | http://localhost:3012 |
| Demo | `demo@pinterest.local` / `password` |

Optional Redis: `docker compose up -d` (port **6391**).

## Features

| Area | Description |
|------|-------------|
| Auth | Register, login, JWT + refresh |
| Home feed | Pins from people you follow + recommendations |
| Explore | Discover all pins |
| Create pin | Create → Create Pin: drag and drop, browse or paste an image (or save from URL), with upload progress, title, description, link and board |
| Image upload | JPEG/PNG/WebP/GIF up to 20 MB, verified by magic bytes. Stored on local disk under `server/uploads/pins/<yyyy>/<mm>/` (git-ignored; set `UPLOADS_DIR` / `MAX_UPLOAD_MB`), served at `/uploads` with long cache headers. Width/height are stored so grids reserve space without layout shift; deleting a pin removes its file, and unpublished uploads are swept after 24 h |
| Boards | Collections per user |
| Save pin | Save to your board |
| Comments | On pin detail |
| Follow | Follow creators |
| Post channels | Topic channels with posts |
| Messaging | DMs + Socket.io |
| Groups | Join collaborative groups |
| Search | Pins, boards, users, channels, groups |
| Profile | Boards grid + created pins |
| Settings | Privacy, notifications, search indexing |
| Reviews & feedback | Partner pages + feedback form |
