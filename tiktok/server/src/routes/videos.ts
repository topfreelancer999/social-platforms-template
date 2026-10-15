import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { linkHashtags } from '../lib/hashtags.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { enrichVideo } from '../services/videos.js'

export const videosRouter = Router()

videosRouter.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  const video = await enrichVideo(param(req, 'id'), req.userId!)
  if (!video) return res.status(404).json({ message: 'Not found' })
  await prisma.video.update({
    where: { id: video.id },
    data: { viewCount: { increment: 1 } },
  })
  const comments = await prisma.videoComment.findMany({
    where: { videoId: video.id },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  res.json({
    video,
    comments: comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      user: { id: c.user.id, username: c.user.username, avatarUrl: c.user.avatarUrl, firstName: c.user.firstName },
    })),
  })
})

videosRouter.use(requireAuth)

videosRouter.post('/', async (req: AuthRequest, res) => {
  const { videoUrl, coverUrl, caption, soundId, duration } = req.body as {
    videoUrl: string
    coverUrl?: string
    caption?: string
    soundId?: string
    duration?: number
  }
  if (!videoUrl) return res.status(400).json({ message: 'videoUrl required' })
  const video = await prisma.video.create({
    data: {
      authorId: req.userId!,
      videoUrl,
      coverUrl: coverUrl ?? `https://picsum.photos/seed/cv${Date.now()}/400/700`,
      caption: caption ?? '',
      soundId: soundId || null,
      duration: duration ?? 15,
    },
  })
  if (soundId) {
    await prisma.sound.update({ where: { id: soundId }, data: { useCount: { increment: 1 } } })
  }
  await linkHashtags(video.id, video.caption)
  res.status(201).json(await enrichVideo(video.id, req.userId!))
})

videosRouter.post('/:id/like', async (req: AuthRequest, res) => {
  const videoId = param(req, 'id')
  const userId = req.userId!
  const existing = await prisma.videoLike.findUnique({
    where: { videoId_userId: { videoId, userId } },
  })
  if (existing) await prisma.videoLike.delete({ where: { id: existing.id } })
  else await prisma.videoLike.create({ data: { videoId, userId } })
  res.json(await enrichVideo(videoId, userId))
})

videosRouter.post('/:id/comment', async (req: AuthRequest, res) => {
  const videoId = param(req, 'id')
  const { content } = req.body as { content: string }
  const comment = await prisma.videoComment.create({
    data: { videoId, userId: req.userId!, content },
    include: { user: true },
  })
  res.status(201).json({
    id: comment.id,
    content: comment.content,
    user: { username: comment.user.username, avatarUrl: comment.user.avatarUrl },
  })
})

videosRouter.post('/:id/bookmark', async (req: AuthRequest, res) => {
  const videoId = param(req, 'id')
  const userId = req.userId!
  const existing = await prisma.bookmark.findUnique({
    where: { videoId_userId: { videoId, userId } },
  })
  if (existing) await prisma.bookmark.delete({ where: { id: existing.id } })
  else await prisma.bookmark.create({ data: { videoId, userId } })
  res.json({ ok: true })
})

videosRouter.delete('/:id', async (req: AuthRequest, res) => {
  const video = await prisma.video.findUnique({ where: { id: param(req, 'id') } })
  if (!video || video.authorId !== req.userId!) return res.status(403).json({ message: 'Forbidden' })
  await prisma.video.delete({ where: { id: video.id } })
  res.json({ ok: true })
})
