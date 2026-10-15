import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { param } from '../lib/params.js'
import { enrichVideo } from '../services/videos.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'

export const soundsRouter = Router()

soundsRouter.get('/', async (_req, res) => {
  const sounds = await prisma.sound.findMany({ orderBy: { useCount: 'desc' }, take: 20 })
  res.json(sounds)
})

soundsRouter.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  const sound = await prisma.sound.findUnique({ where: { id: param(req, 'id') } })
  if (!sound) return res.status(404).json({ message: 'Not found' })
  const videos = await prisma.video.findMany({
    where: { soundId: sound.id },
    take: 20,
    orderBy: { createdAt: 'desc' },
  })
  const items = []
  for (const v of videos) {
    const e = await enrichVideo(v.id, req.userId!)
    if (e) items.push(e)
  }
  res.json({ sound, videos: items })
})
