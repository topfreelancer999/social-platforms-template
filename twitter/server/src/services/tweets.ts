import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
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
      _count: { select: { replies: true, likes: true, retweets: true, quotes: true } },
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
