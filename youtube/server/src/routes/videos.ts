import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { enrichVideo } from '../services/videos.js'
import { toPublicUser } from '../lib/user.js'

export const videosRouter = Router()

videosRouter.get('/', async (req, res) => {
  const q = String(req.query.q ?? '').toLowerCase()
  const category = String(req.query.category ?? '')
  const where: import('@prisma/client').Prisma.VideoWhereInput = { published: true }
  if (category) where.category = category
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
    ]
  }
  const videos = await prisma.video.findMany({
    where,
    take: 40,
    orderBy: { viewCount: 'desc' },
    include: { author: true },
  })
  res.json(
    videos.map((v) => ({
      id: v.id,
      title: v.title,
      thumbnailUrl: v.thumbnailUrl,
      viewCount: v.viewCount,
      duration: v.duration,
      createdAt: v.createdAt,
      channel: {
        id: v.author.id,
        username: v.author.username,
        channelName: v.author.channelName || v.author.firstName,
        avatarUrl: v.author.avatarUrl,
      },
    })),
  )
})

videosRouter.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = param(req, 'id')
  const video = await enrichVideo(id, req.userId!)
  if (!video) return res.status(404).json({ message: 'Not found' })
  await prisma.video.update({ where: { id }, data: { viewCount: { increment: 1 } } })
  const comments = await prisma.videoComment.findMany({
    where: { videoId: id },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  const related = await prisma.video.findMany({
    where: { authorId: video.channel.id, id: { not: id }, published: true },
    take: 8,
    orderBy: { viewCount: 'desc' },
  })
  const relatedEnriched = []
  for (const r of related) {
    const e = await enrichVideo(r.id, req.userId!)
    if (e) relatedEnriched.push(e)
  }
  res.json({
    video: { ...video, viewCount: video.viewCount + 1 },
    comments: comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      user: toPublicUser(c.user),
    })),
    related: relatedEnriched,
  })
})

videosRouter.use(requireAuth)

videosRouter.post('/', async (req: AuthRequest, res) => {
  const { title, description, videoUrl, thumbnailUrl, category, duration } = req.body as {
    title: string
    description?: string
    videoUrl: string
    thumbnailUrl?: string
    category?: string
    duration?: number
  }
  if (!title || !videoUrl) return res.status(400).json({ message: 'title and videoUrl required' })
  const video = await prisma.video.create({
    data: {
      authorId: req.userId!,
      title,
      description: description ?? '',
      videoUrl,
      thumbnailUrl: thumbnailUrl ?? `https://picsum.photos/seed/yt${Date.now()}/640/360`,
      category: category ?? 'General',
      duration: duration ?? 0,
    },
  })
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
  const { content } = req.body as { content: string }
  const comment = await prisma.videoComment.create({
    data: { videoId: param(req, 'id'), userId: req.userId!, content },
    include: { user: true },
  })
  res.status(201).json({ ...comment, user: toPublicUser(comment.user) })
})
