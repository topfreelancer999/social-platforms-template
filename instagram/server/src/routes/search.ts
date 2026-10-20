import { Router } from 'express'
import { PostType } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { enrichPost } from '../services/posts.js'
import { visiblePostsWhere } from '../services/privacy.js'

export const searchRouter = Router()
searchRouter.use(requireAuth)

searchRouter.get('/', async (req: AuthRequest, res) => {
  const q = String(req.query.q ?? '').toLowerCase()
  const type = String(req.query.type ?? 'all')
  if (!q) return res.json({})
  const contains = (s: string) => s.toLowerCase().includes(q)
  const result: Record<string, unknown> = {}
  // Private accounts still show up as users (with a lock), but their posts never leak into results.
  const visible = await visiblePostsWhere(req.userId!)

  if (type === 'all' || type === 'users') {
    const users = await prisma.user.findMany({ take: 50 })
    result.users = users
      .filter((u) => contains(u.displayName) || contains(u.username) || contains(`${u.firstName} ${u.lastName}`))
      .map(toPublicUser)
  }
  if (type === 'all' || type === 'posts') {
    const posts = await prisma.post.findMany({ where: { type: PostType.POST, AND: [visible] }, take: 40 })
    const matched = []
    for (const p of posts.filter((x) => contains(x.caption))) {
      const e = await enrichPost(p.id, req.userId!)
      if (e) matched.push(e)
    }
    result.posts = matched
  }
  if (type === 'all' || type === 'tags') {
    const tag = q.startsWith('#') ? q : `#${q}`
    const posts = await prisma.post.findMany({ where: { caption: { contains: tag }, AND: [visible] }, take: 20 })
    const matched = []
    for (const p of posts) {
      const e = await enrichPost(p.id, req.userId!)
      if (e) matched.push(e)
    }
    result.tags = matched
  }
  if (type === 'all' || type === 'groups') {
    result.groups = (await prisma.group.findMany()).filter(
      (g) => contains(g.name) || contains(g.description),
    )
  }
  res.json(result)
})
