import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { enrichVideo } from '../services/videos.js'

export const playlistsRouter = Router()
playlistsRouter.use(requireAuth)

playlistsRouter.get('/', async (req: AuthRequest, res) => {
  const playlists = await prisma.playlist.findMany({
    where: { userId: req.userId! },
    include: { _count: { select: { items: true } } },
  })
  res.json(playlists.map((p) => ({ ...p, videoCount: p._count.items })))
})

playlistsRouter.post('/', async (req: AuthRequest, res) => {
  const { title } = req.body as { title: string }
  const playlist = await prisma.playlist.create({
    data: { userId: req.userId!, title: title || 'Playlist' },
  })
  res.status(201).json(playlist)
})

playlistsRouter.post('/:id/videos/:videoId', async (req: AuthRequest, res) => {
  const playlistId = param(req, 'id')
  const videoId = param(req, 'videoId')
  const count = await prisma.playlistItem.count({ where: { playlistId } })
  await prisma.playlistItem.upsert({
    where: { playlistId_videoId: { playlistId, videoId } },
    create: { playlistId, videoId, position: count },
    update: {},
  })
  res.json({ ok: true })
})

playlistsRouter.get('/:id', async (req: AuthRequest, res) => {
  const playlist = await prisma.playlist.findUnique({
    where: { id: param(req, 'id') },
    include: { items: { include: { video: true }, orderBy: { position: 'asc' } } },
  })
  if (!playlist) return res.status(404).json({ message: 'Not found' })
  const videos = []
  for (const item of playlist.items) {
    const e = await enrichVideo(item.video.id, req.userId!)
    if (e) videos.push(e)
  }
  res.json({ playlist: { id: playlist.id, title: playlist.title }, videos })
})
