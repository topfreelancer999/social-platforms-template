import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { linkHashtags } from '../lib/hashtags.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { enrichVideo } from '../services/videos.js'
import { createOriginalSound } from '../services/sounds.js'

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

const createVideoSchema = z.object({
  videoUrl: z.string().trim().url('videoUrl must be a valid URL').max(2048),
  coverUrl: z.string().trim().url('coverUrl must be a valid URL').max(2048).optional(),
  caption: z.string().max(2200).default(''),
  /** A sound picked via "Use this sound"; without one the upload gets its own original sound. */
  soundId: z.string().trim().min(1).max(64).optional(),
  duration: z.number().int().min(1).max(600).optional(),
})

videosRouter.post('/', async (req: AuthRequest, res) => {
  const body = createVideoSchema.safeParse(req.body ?? {})
  if (!body.success) return res.status(400).json({ message: body.error.issues[0]?.message ?? 'Invalid body' })
  const { videoUrl, coverUrl, caption, soundId, duration } = body.data
  if (soundId && !(await prisma.sound.findUnique({ where: { id: soundId }, select: { id: true } }))) {
    return res.status(404).json({ message: 'Sound not found' })
  }
  const author = await prisma.user.findUnique({ where: { id: req.userId! } })
  if (!author) return res.status(401).json({ message: 'Unauthorized' })
  const video = await prisma.$transaction(async (tx) => {
    const sound = soundId
      ? await tx.sound.update({ where: { id: soundId }, data: { useCount: { increment: 1 } } })
      : await createOriginalSound(tx, author, videoUrl)
    return tx.video.create({
      data: {
        authorId: author.id,
        videoUrl,
        coverUrl: coverUrl ?? `https://picsum.photos/seed/cv${Date.now()}/400/700`,
        caption,
        soundId: sound.id,
        duration: duration ?? 15,
      },
    })
  })
  await linkHashtags(video.id, video.caption)
  res.status(201).json(await enrichVideo(video.id, req.userId!))
})

async function videoExists(videoId: string) {
  return !!(await prisma.video.findUnique({ where: { id: videoId }, select: { id: true } }))
}

videosRouter.post('/:id/like', async (req: AuthRequest, res) => {
  const videoId = param(req, 'id')
  const userId = req.userId!
  if (!(await videoExists(videoId))) return res.status(404).json({ message: 'Not found' })
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
  if (!(await videoExists(videoId))) return res.status(404).json({ message: 'Not found' })
  const existing = await prisma.bookmark.findUnique({
    where: { videoId_userId: { videoId, userId } },
  })
  if (existing) await prisma.bookmark.delete({ where: { id: existing.id } })
  else await prisma.bookmark.create({ data: { videoId, userId } })
  const bookmarkCount = await prisma.bookmark.count({ where: { videoId } })
  res.json({ ok: true, bookmarked: !existing, bookmarkCount })
})

/** Counted by the feed once a video has been on screen and playing for ~2s. */
videosRouter.post('/:id/view', async (req: AuthRequest, res) => {
  const videoId = param(req, 'id')
  if (!(await videoExists(videoId))) return res.status(404).json({ message: 'Not found' })
  const video = await prisma.video.update({
    where: { id: videoId },
    data: { viewCount: { increment: 1 } },
    select: { viewCount: true },
  })
  res.json({ viewCount: video.viewCount })
})

const shareSchema = z.object({
  channel: z.enum(['copy_link', 'native', 'message']).default('copy_link'),
})

videosRouter.post('/:id/share', async (req: AuthRequest, res) => {
  const videoId = param(req, 'id')
  const body = shareSchema.safeParse(req.body ?? {})
  if (!body.success) return res.status(400).json({ message: body.error.issues[0]?.message ?? 'Invalid body' })
  if (!(await videoExists(videoId))) return res.status(404).json({ message: 'Not found' })
  const video = await prisma.video.update({
    where: { id: videoId },
    data: { shareCount: { increment: 1 } },
    select: { shareCount: true },
  })
  res.json({ shareCount: video.shareCount, channel: body.data.channel })
})

videosRouter.delete('/:id', async (req: AuthRequest, res) => {
  const video = await prisma.video.findUnique({ where: { id: param(req, 'id') } })
  if (!video || video.authorId !== req.userId!) return res.status(403).json({ message: 'Forbidden' })
  await prisma.video.delete({ where: { id: video.id } })
  // An original sound nobody else used goes away with its source video.
  if (video.soundId) {
    await prisma.sound.deleteMany({
      where: { id: video.soundId, isOriginal: true, authorId: video.authorId, videos: { none: {} } },
    })
  }
  res.json({ ok: true })
})
