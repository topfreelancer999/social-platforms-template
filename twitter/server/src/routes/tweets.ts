import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { linkHashtags } from '../lib/hashtags.js'
import { config } from '../config.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { enrichTweet } from '../services/tweets.js'
import { param } from '../lib/params.js'

export const tweetsRouter = Router()
tweetsRouter.use(requireAuth)

tweetsRouter.post('/', async (req: AuthRequest, res) => {
  const { content, imageUrl, replyToId, quoteTweetId, communityId } = req.body as {
    content: string
    imageUrl?: string
    replyToId?: string
    quoteTweetId?: string
    communityId?: string
  }
  if (!content?.trim() && !imageUrl) return res.status(400).json({ message: 'Content required' })
  if (content.length > config.maxTweetLength) {
    return res.status(400).json({ message: `Max ${config.maxTweetLength} characters` })
  }
  const tweet = await prisma.tweet.create({
    data: {
      authorId: req.userId!,
      content: content?.trim() ?? '',
      imageUrl: imageUrl || null,
      replyToId: replyToId || null,
      quoteTweetId: quoteTweetId || null,
      communityId: communityId || null,
    },
  })
  await linkHashtags(tweet.id, tweet.content)
  res.status(201).json(await enrichTweet(tweet.id, req.userId!))
})

tweetsRouter.get('/:id', async (req: AuthRequest, res) => {
  const id = param(req, 'id')
  const tweet = await enrichTweet(id, req.userId!)
  if (!tweet) return res.status(404).json({ message: 'Not found' })
  const replies = await prisma.tweet.findMany({
    where: { replyToId: id },
    orderBy: { createdAt: 'asc' },
  })
  const replyItems = []
  for (const r of replies) {
    const e = await enrichTweet(r.id, req.userId!)
    if (e) replyItems.push(e)
  }
  res.json({ tweet, replies: replyItems })
})

tweetsRouter.post('/:id/like', async (req: AuthRequest, res) => {
  const tweetId = param(req, 'id')
  const userId = req.userId!
  const existing = await prisma.tweetLike.findUnique({
    where: { tweetId_userId: { tweetId, userId } },
  })
  if (existing) await prisma.tweetLike.delete({ where: { id: existing.id } })
  else await prisma.tweetLike.create({ data: { tweetId, userId } })
  res.json(await enrichTweet(tweetId, userId))
})

tweetsRouter.post('/:id/retweet', async (req: AuthRequest, res) => {
  const tweetId = param(req, 'id')
  const userId = req.userId!
  const existing = await prisma.retweet.findUnique({
    where: { tweetId_userId: { tweetId, userId } },
  })
  if (existing) await prisma.retweet.delete({ where: { id: existing.id } })
  else await prisma.retweet.create({ data: { tweetId, userId } })
  res.json(await enrichTweet(tweetId, userId))
})

tweetsRouter.post('/:id/bookmark', async (req: AuthRequest, res) => {
  const tweetId = param(req, 'id')
  const userId = req.userId!
  const existing = await prisma.bookmark.findUnique({
    where: { tweetId_userId: { tweetId, userId } },
  })
  if (existing) await prisma.bookmark.delete({ where: { id: existing.id } })
  else await prisma.bookmark.create({ data: { tweetId, userId } })
  res.json({ ok: true })
})

tweetsRouter.delete('/:id', async (req: AuthRequest, res) => {
  const tweet = await prisma.tweet.findUnique({ where: { id: param(req, 'id') } })
  if (!tweet || tweet.authorId !== req.userId!) return res.status(403).json({ message: 'Forbidden' })
  await prisma.tweet.delete({ where: { id: tweet.id } })
  res.json({ ok: true })
})
