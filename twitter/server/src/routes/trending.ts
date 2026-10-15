import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

export const trendingRouter = Router()

trendingRouter.get('/', async (_req, res) => {
  const hashtags = await prisma.hashtag.findMany({
    include: { _count: { select: { tweets: true } } },
    orderBy: { tweets: { _count: 'desc' } },
    take: 10,
  })
  res.json(
    hashtags.map((h) => ({
      tag: h.tag,
      tweetCount: h._count.tweets,
    })),
  )
})

trendingRouter.get('/hashtag/:tag', async (req, res) => {
  const tag = String(req.params.tag).toLowerCase()
  const hashtag = await prisma.hashtag.findUnique({
    where: { tag },
    include: {
      tweets: {
        include: { tweet: true },
        orderBy: { tweet: { createdAt: 'desc' } },
        take: 30,
      },
    },
  })
  if (!hashtag) return res.json({ tag, tweets: [] })
  res.json({
    tag,
    tweets: hashtag.tweets.map((th) => th.tweet),
  })
})
