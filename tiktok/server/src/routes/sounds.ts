import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { param } from '../lib/params.js'
import { serializeVideos, videoInclude } from '../services/videos.js'
import { findSound, serializeSound, soundInclude } from '../services/sounds.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'

export const soundsRouter = Router()
soundsRouter.use(requireAuth)

const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

/** Sound library / picker search, most used first. */
soundsRouter.get('/', async (req: AuthRequest, res) => {
  const query = listQuery.safeParse(req.query)
  if (!query.success) return res.status(400).json({ message: query.error.issues[0]?.message ?? 'Invalid query' })
  const { q, limit } = query.data
  const sounds = await prisma.sound.findMany({
    where: q
      ? {
          OR: [
            { title: { contains: q } },
            { artist: { contains: q } },
            { author: { username: { contains: q } } },
          ],
        }
      : undefined,
    include: soundInclude(req.userId!),
    orderBy: [{ videos: { _count: 'desc' } }, { createdAt: 'desc' }],
    take: limit,
  })
  res.json(sounds.map(serializeSound))
})

/** The viewer's saved ("Add to Favorites") sounds, newest first. */
soundsRouter.get('/favorites', async (req: AuthRequest, res) => {
  const favorites = await prisma.soundFavorite.findMany({
    where: { userId: req.userId! },
    include: { sound: { include: soundInclude(req.userId!) } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  res.json(favorites.map((f) => serializeSound(f.sound)))
})

soundsRouter.get('/:id', async (req: AuthRequest, res) => {
  const sound = await findSound(param(req, 'id'), req.userId!)
  if (!sound) return res.status(404).json({ message: 'Sound not found' })
  // The creator's first video with an original sound is badged "Original" on the sound page.
  const original =
    sound.isOriginal && sound.author
      ? await prisma.video.findFirst({
          where: { soundId: sound.id, authorId: sound.author.id },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        })
      : null
  res.json({ ...sound, originalVideoId: original?.id ?? null })
})

const videosQuery = z.object({
  sort: z.enum(['popular', 'recent']).default('popular'),
  cursor: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(30).default(18),
})

/** Grid of videos using a sound. `cursor` is an offset so the "popular" ranking pages cleanly. */
soundsRouter.get('/:id/videos', async (req: AuthRequest, res) => {
  const query = videosQuery.safeParse(req.query)
  if (!query.success) return res.status(400).json({ message: query.error.issues[0]?.message ?? 'Invalid query' })
  const { sort, cursor, limit } = query.data
  const soundId = param(req, 'id')
  const exists = await prisma.sound.findUnique({ where: { id: soundId }, select: { id: true } })
  if (!exists) return res.status(404).json({ message: 'Sound not found' })
  const rows = await prisma.video.findMany({
    where: { soundId },
    include: videoInclude(req.userId!),
    orderBy:
      sort === 'popular'
        ? [{ likes: { _count: 'desc' } }, { viewCount: 'desc' }, { id: 'desc' }]
        : [{ createdAt: 'desc' }, { id: 'desc' }],
    skip: cursor,
    take: limit + 1,
  })
  const page = rows.slice(0, limit)
  res.json({
    items: await serializeVideos(page, req.userId!),
    nextCursor: rows.length > limit ? String(cursor + limit) : null,
  })
})

/** Toggle "Add to Favorites" for the viewer. */
soundsRouter.post('/:id/favorite', async (req: AuthRequest, res) => {
  const soundId = param(req, 'id')
  const userId = req.userId!
  const exists = await prisma.sound.findUnique({ where: { id: soundId }, select: { id: true } })
  if (!exists) return res.status(404).json({ message: 'Sound not found' })
  const existing = await prisma.soundFavorite.findUnique({ where: { soundId_userId: { soundId, userId } } })
  if (existing) await prisma.soundFavorite.delete({ where: { id: existing.id } })
  else await prisma.soundFavorite.create({ data: { soundId, userId } })
  const favoriteCount = await prisma.soundFavorite.count({ where: { soundId } })
  res.json({ favorited: !existing, favoriteCount })
})
