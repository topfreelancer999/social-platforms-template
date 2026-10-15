import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'

export async function getPostScore(postId: string) {
  const agg = await prisma.postVote.aggregate({
    where: { postId },
    _sum: { value: true },
  })
  return agg._sum.value ?? 0
}

export async function enrichPost(postId: string, viewerId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      author: true,
      subreddit: true,
      votes: true,
      _count: { select: { comments: true } },
    },
  })
  if (!post) return null
  const score = post.votes.reduce((s, v) => s + v.value, 0)
  const myVote = post.votes.find((v) => v.userId === viewerId)?.value ?? 0
  return {
    id: post.id,
    title: post.title,
    body: post.body,
    imageUrl: post.imageUrl,
    linkUrl: post.linkUrl,
    createdAt: post.createdAt,
    author: toPublicUser(post.author),
    subreddit: { id: post.subreddit.id, name: post.subreddit.name, slug: post.subreddit.slug, iconUrl: post.subreddit.iconUrl },
    score,
    commentCount: post._count.comments,
    myVote,
  }
}

export type EnrichedComment = {
  id: string
  content: string
  parentId: string | null
  createdAt: Date
  author: ReturnType<typeof toPublicUser>
  score: number
  myVote: number
  replies: EnrichedComment[]
}

export async function enrichComment(commentId: string, viewerId: string): Promise<EnrichedComment | null> {
  const c = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { author: true, votes: true, replies: { orderBy: { createdAt: 'asc' } } },
  })
  if (!c) return null
  const score = c.votes.reduce((s, v) => s + v.value, 0)
  const replies: EnrichedComment[] = []
  for (const r of c.replies) {
    const er = await enrichComment(r.id, viewerId)
    if (er) replies.push(er)
  }
  return {
    id: c.id,
    content: c.content,
    parentId: c.parentId,
    createdAt: c.createdAt,
    author: toPublicUser(c.author),
    score,
    myVote: c.votes.find((v) => v.userId === viewerId)?.value ?? 0,
    replies,
  }
}
