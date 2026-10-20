import { Router } from 'express'
import { PostPrivacy, PostType } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { zodMessage } from '../lib/validation.js'
import { enrichPost } from '../services/posts.js'
import { checkPostAccess, visiblePostsWhere } from '../services/privacy.js'

export const postsRouter = Router()
postsRouter.use(requireAuth)

postsRouter.get('/feed', async (req: AuthRequest, res) => {
  const viewerId = req.userId!
  const following = await prisma.follow.findMany({
    where: { followerId: viewerId },
    select: { followingId: true },
  })
  const ids = [viewerId, ...following.map((f) => f.followingId)]
  const posts = await prisma.post.findMany({
    where: { authorId: { in: ids }, type: PostType.POST },
    orderBy: { createdAt: 'desc' },
    take: 40,
  })
  const enriched = []
  for (const p of posts) {
    const e = await enrichPost(p.id, viewerId)
    if (e) enriched.push(e)
  }
  res.json({ posts: enriched })
})

postsRouter.get('/explore', async (req: AuthRequest, res) => {
  const viewerId = req.userId!
  const posts = await prisma.post.findMany({
    where: { type: PostType.POST, privacy: PostPrivacy.PUBLIC, AND: [await visiblePostsWhere(viewerId)] },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })
  const enriched = []
  for (const p of posts) {
    const e = await enrichPost(p.id, viewerId)
    if (e) enriched.push(e)
  }
  res.json({ posts: enriched })
})

postsRouter.get('/reels', async (req: AuthRequest, res) => {
  const viewerId = req.userId!
  const reels = await prisma.post.findMany({
    where: { type: PostType.REEL, videoUrl: { not: null }, AND: [await visiblePostsWhere(viewerId)] },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  const enriched = []
  for (const p of reels) {
    const e = await enrichPost(p.id, viewerId)
    if (e) enriched.push(e)
  }
  res.json({ reels: enriched })
})

postsRouter.post('/', async (req: AuthRequest, res) => {
  const { caption, imageUrl, videoUrl, type, privacy, groupId } = req.body as {
    caption?: string
    imageUrl?: string
    videoUrl?: string
    type?: PostType
    privacy?: PostPrivacy
    groupId?: string
  }
  const post = await prisma.post.create({
    data: {
      authorId: req.userId!,
      caption: caption?.trim() ?? '',
      imageUrl: imageUrl ?? null,
      videoUrl: videoUrl ?? null,
      type: type ?? PostType.POST,
      privacy: privacy ?? PostPrivacy.PUBLIC,
      groupId: groupId || null,
    },
  })
  res.status(201).json(await enrichPost(post.id, req.userId!))
})

postsRouter.get('/:id', async (req: AuthRequest, res) => {
  const access = await checkPostAccess(param(req, 'id'), req.userId!)
  if (!access.ok) return res.status(access.status).json({ message: access.message })
  res.json({ post: await enrichPost(access.postId, req.userId!) })
})

postsRouter.post('/:id/like', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const access = await checkPostAccess(param(req, 'id'), userId)
  if (!access.ok) return res.status(access.status).json({ message: access.message })
  const postId = access.postId
  const existing = await prisma.postLike.findUnique({
    where: { postId_userId: { postId, userId } },
  })
  if (existing) await prisma.postLike.delete({ where: { id: existing.id } })
  else await prisma.postLike.create({ data: { postId, userId } })
  res.json(await enrichPost(postId, userId))
})

const commentSchema = z.object({ content: z.string().trim().min(1).max(2200) })

postsRouter.post('/:id/comments', async (req: AuthRequest, res) => {
  const body = commentSchema.safeParse(req.body)
  if (!body.success) return res.status(400).json({ message: zodMessage(body.error) })
  const access = await checkPostAccess(param(req, 'id'), req.userId!)
  if (!access.ok) return res.status(access.status).json({ message: access.message })
  const postId = access.postId
  await prisma.comment.create({
    data: { postId, authorId: req.userId!, content: body.data.content },
  })
  res.json(await enrichPost(postId, req.userId!))
})
