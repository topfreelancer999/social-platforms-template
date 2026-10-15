import { Router } from 'express'
import { z } from 'zod'
import { NotificationType } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { linkHashtags } from '../lib/hashtags.js'
import { config } from '../config.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { enrichTweet } from '../services/tweets.js'
import { getBlockedIds, isBlocked } from '../services/follows.js'
import { notify, retractNotification, snippet } from '../services/notifications.js'
import { param } from '../lib/params.js'

export const tweetsRouter = Router()
tweetsRouter.use(requireAuth)

const optionalId = z.string().trim().min(1).max(64).nullish()

const createTweetSchema = z
  .object({
    content: z
      .string()
      .max(config.maxTweetLength, `Max ${config.maxTweetLength} characters`)
      .default(''),
    imageUrl: z.string().url().nullish().or(z.literal('')),
    replyToId: optionalId,
    quoteTweetId: optionalId,
    communityId: optionalId,
  })
  .refine((d) => d.content.trim().length > 0 || !!d.imageUrl, { message: 'Content required' })

const pageQuery = z.object({ page: z.coerce.number().int().min(1).max(500).default(1) })

const QUOTES_PAGE_SIZE = 20

function displayName(u: { firstName: string; lastName: string }) {
  return `${u.firstName} ${u.lastName}`.trim()
}

tweetsRouter.post('/', async (req: AuthRequest, res) => {
  const parsed = createTweetSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid input' })
  }
  const { content, imageUrl, replyToId, quoteTweetId, communityId } = parsed.data
  const userId = req.userId!

  if (replyToId && !(await prisma.tweet.findUnique({ where: { id: replyToId }, select: { id: true } }))) {
    return res.status(404).json({ message: 'Post you are replying to was not found' })
  }
  const quoted = quoteTweetId
    ? await prisma.tweet.findUnique({ where: { id: quoteTweetId }, select: { id: true, authorId: true } })
    : null
  if (quoteTweetId && !quoted) return res.status(404).json({ message: 'Quoted post not found' })
  if (quoted && (await isBlocked(userId, quoted.authorId))) {
    return res.status(403).json({ message: 'You cannot quote this post' })
  }

  const tweet = await prisma.tweet.create({
    data: {
      authorId: userId,
      content: content.trim(),
      imageUrl: imageUrl || null,
      replyToId: replyToId || null,
      quoteTweetId: quoted?.id ?? null,
      isQuote: !!quoted,
      communityId: communityId || null,
    },
    include: { author: true },
  })
  await linkHashtags(tweet.id, tweet.content)

  if (quoted) {
    await notify({
      userId: quoted.authorId,
      actorId: userId,
      type: NotificationType.QUOTE,
      title: `${displayName(tweet.author)} quoted your post`,
      body: snippet(tweet.content),
      link: `/tweet/${tweet.id}`,
    })
  }
  res.status(201).json(await enrichTweet(tweet.id, userId))
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

/** Quote posts of a post, newest first. */
tweetsRouter.get('/:id/quotes', async (req: AuthRequest, res) => {
  const id = param(req, 'id')
  const query = pageQuery.safeParse(req.query)
  if (!query.success) return res.status(400).json({ message: 'Invalid page' })
  const { page } = query.data
  const viewerId = req.userId!
  const exists = await prisma.tweet.findUnique({ where: { id }, select: { id: true } })
  if (!exists) return res.status(404).json({ message: 'Not found' })

  const blocked = await getBlockedIds(viewerId)
  const where = { quoteTweetId: id, authorId: { notIn: [...blocked] } }
  const [total, quotes] = await Promise.all([
    prisma.tweet.count({ where }),
    prisma.tweet.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * QUOTES_PAGE_SIZE,
      take: QUOTES_PAGE_SIZE,
      select: { id: true },
    }),
  ])
  const items = []
  for (const q of quotes) {
    const e = await enrichTweet(q.id, viewerId, blocked)
    if (e) items.push(e)
  }
  res.json({ items, page, total, hasMore: page * QUOTES_PAGE_SIZE < total })
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

async function setRepost(tweetId: string, userId: string, on: boolean) {
  const tweet = await prisma.tweet.findUnique({ where: { id: tweetId }, select: { id: true, authorId: true, content: true } })
  if (!tweet) return { status: 404 as const }
  if (on && (await isBlocked(userId, tweet.authorId))) return { status: 403 as const }
  const link = `/tweet/${tweet.id}`
  if (on) {
    const existing = await prisma.retweet.findUnique({ where: { tweetId_userId: { tweetId, userId } } })
    if (!existing) {
      await prisma.retweet.create({ data: { tweetId, userId } })
      const actor = await prisma.user.findUnique({ where: { id: userId } })
      await notify({
        userId: tweet.authorId,
        actorId: userId,
        type: NotificationType.RETWEET,
        title: `${actor ? displayName(actor) : 'Someone'} reposted your post`,
        body: snippet(tweet.content),
        link,
      })
    }
  } else {
    const removed = await prisma.retweet.deleteMany({ where: { tweetId, userId } })
    if (removed.count) {
      await retractNotification({ userId: tweet.authorId, actorId: userId, type: NotificationType.RETWEET, link })
    }
  }
  return { status: 200 as const, tweet: await enrichTweet(tweetId, userId) }
}

function sendRepostResult(res: import('express').Response, result: Awaited<ReturnType<typeof setRepost>>) {
  if (result.status === 404) return res.status(404).json({ message: 'Not found' })
  if (result.status === 403) return res.status(403).json({ message: 'You cannot repost this post' })
  return res.json(result.tweet)
}

/** Repost (idempotent). */
tweetsRouter.post('/:id/repost', async (req: AuthRequest, res) => {
  sendRepostResult(res, await setRepost(param(req, 'id'), req.userId!, true))
})

/** Undo repost (idempotent). */
tweetsRouter.delete('/:id/repost', async (req: AuthRequest, res) => {
  sendRepostResult(res, await setRepost(param(req, 'id'), req.userId!, false))
})

/** Legacy toggle kept for older clients. */
tweetsRouter.post('/:id/retweet', async (req: AuthRequest, res) => {
  const tweetId = param(req, 'id')
  const userId = req.userId!
  const existing = await prisma.retweet.findUnique({ where: { tweetId_userId: { tweetId, userId } } })
  sendRepostResult(res, await setRepost(tweetId, userId, !existing))
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
  // A deleted quote should no longer notify the quoted author.
  await prisma.notification.deleteMany({
    where: { actorId: tweet.authorId, type: NotificationType.QUOTE, link: `/tweet/${tweet.id}` },
  })
  res.json({ ok: true })
})
