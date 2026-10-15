import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { enrichPost, enrichComment } from '../services/posts.js'

export const postsRouter = Router()
postsRouter.use(requireAuth)

postsRouter.get('/feed', async (req: AuthRequest, res) => {
  const sort = String(req.query.sort ?? 'hot')
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  const enriched = []
  for (const p of posts) {
    const e = await enrichPost(p.id, req.userId!)
    if (e) enriched.push(e)
  }
  if (sort === 'hot' || sort === 'top') {
    enriched.sort((a, b) => b.score - a.score)
  }
  res.json({ posts: enriched })
})

postsRouter.get('/subreddit/:slug', async (req: AuthRequest, res) => {
  const sub = await prisma.subreddit.findUnique({ where: { slug: param(req, 'slug') } })
  if (!sub) return res.status(404).json({ message: 'Not found' })
  const posts = await prisma.post.findMany({
    where: { subredditId: sub.id },
    orderBy: { createdAt: 'desc' },
    take: 40,
  })
  const enriched = []
  for (const p of posts) {
    const e = await enrichPost(p.id, req.userId!)
    if (e) enriched.push(e)
  }
  enriched.sort((a, b) => b.score - a.score)
  res.json({ posts: enriched })
})

postsRouter.post('/', async (req: AuthRequest, res) => {
  const { title, body, subredditSlug, imageUrl, linkUrl } = req.body as {
    title: string
    body?: string
    subredditSlug: string
    imageUrl?: string
    linkUrl?: string
  }
  const sub = await prisma.subreddit.findUnique({ where: { slug: subredditSlug } })
  if (!sub) return res.status(404).json({ message: 'Subreddit not found' })
  const post = await prisma.post.create({
    data: {
      authorId: req.userId!,
      subredditId: sub.id,
      title: title.trim(),
      body: body?.trim() ?? '',
      imageUrl: imageUrl ?? null,
      linkUrl: linkUrl ?? null,
    },
  })
  await prisma.user.update({
    where: { id: req.userId! },
    data: { karma: { increment: 1 } },
  })
  res.status(201).json(await enrichPost(post.id, req.userId!))
})

postsRouter.get('/:id', async (req: AuthRequest, res) => {
  const post = await enrichPost(param(req, 'id'), req.userId!)
  if (!post) return res.status(404).json({ message: 'Not found' })
  const comments = await prisma.comment.findMany({
    where: { postId: param(req, 'id'), parentId: null },
    orderBy: { createdAt: 'asc' },
  })
  const tree = []
  for (const c of comments) {
    const e = await enrichComment(c.id, req.userId!)
    if (e) tree.push(e)
  }
  tree.sort((a, b) => b.score - a.score)
  res.json({ post, comments: tree })
})

postsRouter.post('/:id/vote', async (req: AuthRequest, res) => {
  const postId = param(req, 'id')
  const value = (req.body as { value: number }).value === -1 ? -1 : 1
  const userId = req.userId!
  const existing = await prisma.postVote.findUnique({
    where: { postId_userId: { postId, userId } },
  })
  if (existing?.value === value) {
    await prisma.postVote.delete({ where: { id: existing.id } })
  } else if (existing) {
    await prisma.postVote.update({ where: { id: existing.id }, data: { value } })
  } else {
    await prisma.postVote.create({ data: { postId, userId, value } })
  }
  res.json(await enrichPost(postId, userId))
})

postsRouter.post('/:id/comments', async (req: AuthRequest, res) => {
  const postId = param(req, 'id')
  const { content, parentId } = req.body as { content: string; parentId?: string }
  await prisma.comment.create({
    data: { postId, authorId: req.userId!, content: content.trim(), parentId: parentId || null },
  })
  await prisma.user.update({
    where: { id: req.userId! },
    data: { karma: { increment: 1 } },
  })
  const post = await enrichPost(postId, req.userId!)
  const comments = await prisma.comment.findMany({
    where: { postId, parentId: null },
    orderBy: { createdAt: 'asc' },
  })
  const tree = []
  for (const c of comments) {
    const e = await enrichComment(c.id, req.userId!)
    if (e) tree.push(e)
  }
  res.json({ post, comments: tree })
})

postsRouter.post('/comments/:commentId/vote', async (req: AuthRequest, res) => {
  const commentId = param(req, 'commentId')
  const value = (req.body as { value: number }).value === -1 ? -1 : 1
  const userId = req.userId!
  const existing = await prisma.commentVote.findUnique({
    where: { commentId_userId: { commentId, userId } },
  })
  if (existing?.value === value) {
    await prisma.commentVote.delete({ where: { id: existing.id } })
  } else if (existing) {
    await prisma.commentVote.update({ where: { id: existing.id }, data: { value } })
  } else {
    await prisma.commentVote.create({ data: { commentId, userId, value } })
  }
  res.json(await enrichComment(commentId, userId))
})
