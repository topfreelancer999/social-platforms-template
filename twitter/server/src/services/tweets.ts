import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { linkHashtags } from '../lib/hashtags.js'
import { toPublicUser } from '../lib/user.js'
import { getBlockedIds } from './follows.js'

export async function enrichTweet(tweetId: string, viewerId: string, blockedIds?: Set<string>) {
  const tweet = await prisma.tweet.findUnique({
    where: { id: tweetId },
    include: {
      author: true,
      quoteTweet: { include: { author: true } },
      likes: { where: { userId: viewerId }, select: { id: true } },
      retweets: { where: { userId: viewerId }, select: { id: true } },
      _count: { select: { replies: true, likes: true, retweets: true, quotes: true, threadPosts: true } },
    },
  })
  if (!tweet) return null
  const blocked = blockedIds ?? (tweet.quoteTweet ? await getBlockedIds(viewerId) : new Set<string>())
  const quoted = tweet.quoteTweet && !blocked.has(tweet.quoteTweet.authorId) ? tweet.quoteTweet : null
  return {
    id: tweet.id,
    content: tweet.content,
    imageUrl: tweet.imageUrl,
    replyToId: tweet.replyToId,
    quoteTweetId: tweet.quoteTweetId,
    isQuote: tweet.isQuote || !!tweet.quoteTweetId,
    communityId: tweet.communityId,
    threadRootId: tweet.threadRootId,
    /** Posts in the thread this post starts (1 when it is not a thread root). */
    threadLength: tweet._count.threadPosts + 1,
    createdAt: tweet.createdAt,
    author: toPublicUser(tweet.author),
    quoteTweet: quoted
      ? {
          id: quoted.id,
          content: quoted.content,
          imageUrl: quoted.imageUrl,
          createdAt: quoted.createdAt,
          author: toPublicUser(quoted.author),
        }
      : null,
    /** The post was a quote but its original was deleted or is hidden from the viewer. */
    quoteUnavailable: (tweet.isQuote || !!tweet.quoteTweetId) && !quoted,
    likeCount: tweet._count.likes,
    retweetCount: tweet._count.retweets,
    quoteCount: tweet._count.quotes,
    replyCount: tweet._count.replies,
    liked: tweet.likes.length > 0,
    retweeted: tweet.retweets.length > 0,
  }
}

export type EnrichedTweet = NonNullable<Awaited<ReturnType<typeof enrichTweet>>>

interface TimelineOptions {
  viewerId: string
  /** Filter for original posts that belong in this timeline. */
  tweetWhere: Prisma.TweetWhereInput
  /** Users whose reposts appear in this timeline. */
  repostUserIds: string[]
  page: number
  pageSize: number
}

/**
 * Merges original posts and reposts into one reverse-chronological timeline.
 * Each original appears at most once (its most recent entry wins), and entries
 * involving users blocked in either direction are dropped.
 */
export async function buildTimeline({ viewerId, tweetWhere, repostUserIds, page, pageSize }: TimelineOptions) {
  const windowEnd = page * pageSize
  const limit = windowEnd * 2 + 1
  const [tweets, reposts, blocked] = await Promise.all([
    prisma.tweet.findMany({
      where: tweetWhere,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, authorId: true, createdAt: true },
    }),
    repostUserIds.length
      ? prisma.retweet.findMany({
          where: { userId: { in: repostUserIds } },
          orderBy: { createdAt: 'desc' },
          take: limit,
          include: { user: true, tweet: { select: { authorId: true } } },
        })
      : Promise.resolve([]),
    getBlockedIds(viewerId),
  ])

  type Entry = {
    entryId: string
    tweetId: string
    at: Date
    repostedBy: ReturnType<typeof toPublicUser> | null
  }
  const entries: Entry[] = []
  for (const t of tweets) {
    if (blocked.has(t.authorId)) continue
    entries.push({ entryId: `t:${t.id}`, tweetId: t.id, at: t.createdAt, repostedBy: null })
  }
  for (const r of reposts) {
    if (blocked.has(r.userId) || blocked.has(r.tweet.authorId)) continue
    entries.push({ entryId: `rt:${r.id}`, tweetId: r.tweetId, at: r.createdAt, repostedBy: toPublicUser(r.user) })
  }
  entries.sort((a, b) => b.at.getTime() - a.at.getTime())

  const seen = new Set<string>()
  const deduped = entries.filter((e) => {
    if (seen.has(e.tweetId)) return false
    seen.add(e.tweetId)
    return true
  })

  const items = []
  for (const e of deduped.slice((page - 1) * pageSize, windowEnd)) {
    const tweet = await enrichTweet(e.tweetId, viewerId, blocked)
    if (tweet) items.push({ ...tweet, entryId: e.entryId, repostedBy: e.repostedBy })
  }
  const hasMore = deduped.length > windowEnd || tweets.length === limit || reposts.length === limit
  return { items, page, hasMore }
}

export const MAX_THREAD_POSTS = 25

export interface ThreadPostInput {
  content: string
  imageUrl?: string | null
}

/** Ids of every post in the thread rooted at `rootId`, root first, in posting order. */
export async function getThreadIds(rootId: string, db: Prisma.TransactionClient = prisma) {
  const posts = await db.tweet.findMany({
    where: { OR: [{ id: rootId }, { threadRootId: rootId }] },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, createdAt: true },
  })
  return posts
}

/**
 * Inserts `posts` as a self-reply chain: each post replies to the previous one.
 * Timestamps are spaced 1ms apart so thread order is stable.
 */
async function insertChain(
  tx: Prisma.TransactionClient,
  opts: {
    authorId: string
    posts: ThreadPostInput[]
    replyToId: string | null
    threadRootId: string | null
    communityId?: string | null
    startAt: number
  },
) {
  let parentId = opts.replyToId
  let rootId = opts.threadRootId
  const ids: string[] = []
  for (const [i, post] of opts.posts.entries()) {
    const tweet = await tx.tweet.create({
      data: {
        authorId: opts.authorId,
        content: post.content.trim(),
        imageUrl: post.imageUrl || null,
        replyToId: parentId,
        threadRootId: rootId,
        // Only the root belongs to the community feed; the rest are replies.
        communityId: i === 0 && !rootId ? opts.communityId || null : null,
        createdAt: new Date(opts.startAt + i),
      },
    })
    await linkHashtags(tweet.id, tweet.content, tx)
    rootId ??= tweet.id
    parentId = tweet.id
    ids.push(tweet.id)
  }
  return ids
}

async function enrichAll(ids: string[], viewerId: string) {
  const blocked = await getBlockedIds(viewerId)
  const items: EnrichedTweet[] = []
  for (const id of ids) {
    const e = await enrichTweet(id, viewerId, blocked)
    if (e) items.push(e)
  }
  return items
}

/** Publishes a new thread atomically: all posts or none. */
export async function createThread(authorId: string, posts: ThreadPostInput[], communityId?: string | null) {
  const ids = await prisma.$transaction((tx) =>
    insertChain(tx, { authorId, posts, replyToId: null, threadRootId: null, communityId, startAt: Date.now() }),
  )
  return enrichAll(ids, authorId)
}

/** Appends posts to the end of the author's thread containing `tweetId` (or starts one from it). */
export async function extendThread(tweetId: string, userId: string, posts: ThreadPostInput[]) {
  const tweet = await prisma.tweet.findUnique({
    where: { id: tweetId },
    select: { id: true, authorId: true, threadRootId: true },
  })
  if (!tweet) return { status: 404 as const, message: 'Not found' }
  if (tweet.authorId !== userId) {
    return { status: 403 as const, message: 'You can only add to your own thread' }
  }
  const rootId = tweet.threadRootId ?? tweet.id
  const ids = await prisma.$transaction(async (tx) => {
    const existing = await getThreadIds(rootId, tx)
    if (existing.length + posts.length > MAX_THREAD_POSTS) return null
    const last = existing[existing.length - 1]
    return insertChain(tx, {
      authorId: userId,
      posts,
      replyToId: last.id,
      threadRootId: rootId,
      startAt: Math.max(Date.now(), last.createdAt.getTime() + 1),
    })
  })
  if (!ids) {
    return { status: 400 as const, message: `A thread can have at most ${MAX_THREAD_POSTS} posts` }
  }
  return { status: 201 as const, rootId, items: await enrichAll(ids, userId) }
}

/** The thread containing `tweetId` in order (a lone post is a thread of one), or null if not found. */
export async function getThread(tweetId: string, viewerId: string) {
  const tweet = await prisma.tweet.findUnique({ where: { id: tweetId }, select: { id: true, threadRootId: true } })
  if (!tweet) return null
  const rootId = tweet.threadRootId ?? tweet.id
  const posts = await getThreadIds(rootId)
  return { rootId, items: await enrichAll(posts.map((p) => p.id), viewerId) }
}
