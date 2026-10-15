import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { enrichPost } from '../services/posts.js'

export const searchRouter = Router()
searchRouter.use(requireAuth)

searchRouter.get('/', async (req: AuthRequest, res) => {
  const q = String(req.query.q ?? '').toLowerCase()
  const type = String(req.query.type ?? 'all')
  if (!q) return res.json({})
  const contains = (s: string) => s.toLowerCase().includes(q)
  const result: Record<string, unknown> = {}

  if (type === 'all' || type === 'posts') {
    const posts = await prisma.post.findMany({ take: 40 })
    const matched = []
    for (const p of posts.filter((x) => contains(x.title) || contains(x.body))) {
      const e = await enrichPost(p.id, req.userId!)
      if (e) matched.push(e)
    }
    result.posts = matched
  }
  if (type === 'all' || type === 'subreddits') {
    result.subreddits = (await prisma.subreddit.findMany()).filter(
      (s) => contains(s.name) || contains(s.slug) || contains(s.description),
    )
  }
  if (type === 'all' || type === 'users') {
    const users = await prisma.user.findMany({ take: 50 })
    result.users = users
      .filter((u) => contains(u.username) || contains(u.displayName) || contains(`${u.firstName} ${u.lastName}`))
      .map(toPublicUser)
  }
  if (type === 'all' || type === 'groups') {
    result.groups = (await prisma.group.findMany()).filter(
      (g) => contains(g.name) || contains(g.description),
    )
  }
  res.json(result)
})
