import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'

export async function enrichTweet(tweetId: string, viewerId: string) {
  const tweet = await prisma.tweet.findUnique({
    where: { id: tweetId },
    include: {
      author: true,
      quoteTweet: { include: { author: true } },
      likes: true,
      retweets: true,
      _count: { select: { replies: true } },
    },
  })
  if (!tweet) return null
  const liked = tweet.likes.some((l) => l.userId === viewerId)
  const retweeted = tweet.retweets.some((r) => r.userId === viewerId)
  return {
    id: tweet.id,
    content: tweet.content,
    imageUrl: tweet.imageUrl,
    replyToId: tweet.replyToId,
    quoteTweetId: tweet.quoteTweetId,
    communityId: tweet.communityId,
    createdAt: tweet.createdAt,
    author: toPublicUser(tweet.author),
    quoteTweet: tweet.quoteTweet
      ? {
          id: tweet.quoteTweet.id,
          content: tweet.quoteTweet.content,
          author: toPublicUser(tweet.quoteTweet.author),
        }
      : null,
    likeCount: tweet.likes.length,
    retweetCount: tweet.retweets.length,
    replyCount: tweet._count.replies,
    liked,
    retweeted,
  }
}
