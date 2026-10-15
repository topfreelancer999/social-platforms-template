import { Router } from 'express'
import { ReactionType } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { PostPrivacy } from '@prisma/client'
import { param } from '../lib/params.js'

export const postsRouter = Router()
postsRouter.use(requireAuth)

async function enrichPost(postId: string, viewerId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      author: true,
      comments: { include: { author: true }, orderBy: { createdAt: 'asc' }, take: 20 },
      reactions: true,
      _count: { select: { shares: true } },
    },
  })
  if (!post) return null
  const summary: Record<string, number> = {}
  for (const r of post.reactions) summary[r.type] = (summary[r.type] ?? 0) + 1
  const myReaction = post.reactions.find((r) => r.userId === viewerId)
  return {
    ...post,
    author: toPublicUser(post.author),
    comments: post.comments.map((c) => ({ ...c, author: toPublicUser(c.author) })),
    reactionSummary: summary,
    totalReactions: post.reactions.length,
    shareCount: post._count.shares,
    myReaction: myReaction?.type ?? null,
  }
}

postsRouter.post('/', async (req: AuthRequest, res) => {
  const { content, imageUrl, privacy, groupId } = req.body as {
    content: string
    imageUrl?: string
    privacy?: PostPrivacy
    groupId?: string
  }
  const post = await prisma.post.create({
    data: {
      authorId: req.userId!,
      content: content ?? '',
      imageUrl,
      privacy: privacy ?? PostPrivacy.FRIENDS,
      groupId: groupId || null,
    },
  })
  res.status(201).json(await enrichPost(post.id, req.userId!))
})

postsRouter.post('/:id/react', async (req: AuthRequest, res) => {
  const postId = param(req, 'id')
  const type = (req.body as { type: ReactionType }).type
  const userId = req.userId!
  const existing = await prisma.reaction.findUnique({
    where: { postId_userId: { postId, userId } },
  })
  if (existing) {
    if (existing.type === type) await prisma.reaction.delete({ where: { id: existing.id } })
    else await prisma.reaction.update({ where: { id: existing.id }, data: { type } })
  } else {
    await prisma.reaction.create({ data: { postId, userId, type } })
  }
  res.json(await enrichPost(postId, userId))
})

postsRouter.post('/:id/comments', async (req: AuthRequest, res) => {
  const comment = await prisma.comment.create({
    data: { postId: param(req, 'id'), authorId: req.userId!, content: (req.body as { content: string }).content },
    include: { author: true },
  })
  res.status(201).json({ ...comment, author: toPublicUser(comment.author) })
})

postsRouter.post('/:id/share', async (req: AuthRequest, res) => {
  const postId = param(req, 'id')
  const userId = req.userId!
  await prisma.share.upsert({
    where: { postId_userId: { postId, userId } },
    create: { postId, userId },
    update: {},
  })
  res.json(await enrichPost(postId, userId))
})
