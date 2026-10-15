import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

export const trendingRouter = Router()

trendingRouter.get('/hashtags', async (_req, res) => {
  const tags = await prisma.hashtag.findMany({
    include: { _count: { select: { videos: true } } },
    orderBy: { videos: { _count: 'desc' } },
    take: 15,
  })
  res.json(tags.map((h) => ({ tag: h.tag, count: h._count.videos })))
})

trendingRouter.get('/hashtag/:tag', async (req, res) => {
  const tag = String(req.params.tag).toLowerCase()
  const hashtag = await prisma.hashtag.findUnique({
    where: { tag },
    include: { videos: { include: { video: true }, take: 30 } },
  })
  if (!hashtag) return res.json({ tag, videos: [] })
  res.json({ tag, videos: hashtag.videos.map((v) => v.video) })
})
