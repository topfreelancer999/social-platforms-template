import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { enrichPost, getCommentTree, listPosts } from '../services/posts.js'
import { COMMENT_SORTS, POST_SORTS, parseSort } from '../services/ranking.js'
import { voteComment, votePost, voteSchema } from '../services/votes.js'

export const postsRouter = Router()
postsRouter.use(requireAuth)

// Votes are idempotent (the body is the desired state), but still cap
// click-spam per account.
const voteLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => (req as AuthRequest).userId ?? req.ip ?? 'anon',
  message: { message: "You're doing that too much. Try again in a minute." },
})

const commentSchema = z.object({
  content: z.string().trim().min(1, 'Comment cannot be empty').max(10000),
  parentId: z.string().min(1).nullish(),
})

postsRouter.get('/feed', async (req: AuthRequest, res) => {
  const sort = parseSort(req.query.sort, POST_SORTS, 'hot')
  res.json({ posts: await listPosts(req.userId!, sort) })
})

postsRouter.get('/subreddit/:slug', async (req: AuthRequest, res) => {
  const sub = await prisma.subreddit.findUnique({ where: { slug: param(req, 'slug') } })
  if (!sub) return res.status(404).json({ message: 'Not found' })
  const sort = parseSort(req.query.sort, POST_SORTS, 'hot')
  res.json({ posts: await listPosts(req.userId!, sort, { subredditId: sub.id }, 40) })
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
  // Like Reddit, your own post starts with your upvote (self-votes never add karma).
  const post = await prisma.post.create({
    data: {
      authorId: req.userId!,
      subredditId: sub.id,
      title: title.trim(),
      body: body?.trim() ?? '',
      imageUrl: imageUrl ?? null,
      linkUrl: linkUrl ?? null,
      score: 1,
      upvotes: 1,
      votes: { create: { userId: req.userId!, value: 1 } },
    },
  })
  res.status(201).json(await enrichPost(post.id, req.userId!))
})

postsRouter.get('/:id', async (req: AuthRequest, res) => {
  const post = await enrichPost(param(req, 'id'), req.userId!)
  if (!post) return res.status(404).json({ message: 'Not found' })
  const sort = parseSort(req.query.sort, COMMENT_SORTS, 'best')
  res.json({ post, comments: await getCommentTree(post.id, req.userId!, sort) })
})

const castPostVote = async (req: AuthRequest, res: import('express').Response) => {
  const body = voteSchema.safeParse(req.body ?? {})
  if (!body.success) return res.status(400).json({ message: body.error.issues[0].message })
  const vote = await votePost(param(req, 'id'), req.userId!, body.data.value)
  if (!vote) return res.status(404).json({ message: 'Post not found' })
  res.json(vote)
}
postsRouter.put('/:id/vote', voteLimiter, castPostVote)
postsRouter.post('/:id/vote', voteLimiter, castPostVote)

postsRouter.post('/:id/comments', async (req: AuthRequest, res) => {
  const postId = param(req, 'id')
  const body = commentSchema.safeParse(req.body ?? {})
  if (!body.success) return res.status(400).json({ message: body.error.issues[0].message })
  const exists = await prisma.post.count({ where: { id: postId } })
  if (!exists) return res.status(404).json({ message: 'Post not found' })
  const parentId = body.data.parentId ?? null
  if (parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: parentId } })
    if (!parent || parent.postId !== postId) return res.status(404).json({ message: 'Parent comment not found' })
  }
  await prisma.comment.create({
    data: {
      postId,
      authorId: req.userId!,
      content: body.data.content,
      parentId,
      score: 1,
      upvotes: 1,
      votes: { create: { userId: req.userId!, value: 1 } },
    },
  })
  const sort = parseSort(req.query.sort, COMMENT_SORTS, 'best')
  res.json({ post: await enrichPost(postId, req.userId!), comments: await getCommentTree(postId, req.userId!, sort) })
})

const castCommentVote = async (req: AuthRequest, res: import('express').Response) => {
  const body = voteSchema.safeParse(req.body ?? {})
  if (!body.success) return res.status(400).json({ message: body.error.issues[0].message })
  const vote = await voteComment(param(req, 'commentId'), req.userId!, body.data.value)
  if (!vote) return res.status(404).json({ message: 'Comment not found' })
  res.json(vote)
}
postsRouter.put('/comments/:commentId/vote', voteLimiter, castCommentVote)
postsRouter.post('/comments/:commentId/vote', voteLimiter, castCommentVote)
