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
- **Custom player**: YouTube-style controls, scrubber with buffered range and hover time, volume, full screen, auto-hiding controls
  - **Playback speed** 0.25×–2× from the ⚙ menu (or `<` / `>`)
  - **Subtitles/CC** from WebVTT tracks (`<track>` + custom cue overlay); creators upload or replace `.vtt` per language from the watch page (*Subtitles* button)
  - **Theater mode** (`t`): full-width player without reloading the video
  - **Resume position**: progress is saved while watching and on leave; reopening a video resumes with a *Start over* option, and thumbnails show a red watched bar
  - Speed, captions language and theater mode are saved to the account (`PATCH /api/settings/player`)
  - Keyboard: `k`/space play, `j`/`l` ±10s, ←/→ ±5s, `0`–`9` jump, `m` mute, `c` captions, `f` full screen
- Subscribe to channels
- YouTube Studio upload (video URL)
- Subscriptions feed, playlists
- Search (videos, channels, communities)

### Player API

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/api/videos/:id` | Also returns `captions`, `resumeAt` and `player` prefs |
| `PUT` | `/api/videos/:id/progress` | `{ position, duration }` in seconds |
| `GET` | `/api/videos/:id/captions/:captionId` | `text/vtt`, public so `<track>` can load it |
| `POST` / `DELETE` | `/api/videos/:id/captions[/:captionId]` | Creator only; one track per language |
| `PATCH` | `/api/settings/player` | `{ playbackSpeed, captionsLanguage, theaterMode }` |

Seed: every video has English captions (the demo channel's own videos also have uploaded English + Spanish tracks), and the demo account is part-way through a few videos. Sample videos are openly licensed films hosted by W3C and Wikimedia Commons.

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
