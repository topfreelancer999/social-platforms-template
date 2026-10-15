import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'

export const searchRouter = Router()
searchRouter.use(requireAuth)

searchRouter.get('/', async (req: AuthRequest, res) => {
  const q = String(req.query.q ?? '').toLowerCase()
  const type = String(req.query.type ?? 'all')
  if (!q) return res.json({})

  const contains = (s: string) => s.toLowerCase().includes(q)
  const result: Record<string, unknown> = {}

  if (type === 'all' || type === 'people') {
    const users = await prisma.user.findMany({ take: 50 })
    result.people = users
      .filter((u) => contains(`${u.firstName} ${u.lastName}`) || contains(u.username))
      .map(toPublicUser)
  }
  if (type === 'all' || type === 'groups') {
    const groups = await prisma.group.findMany()
    result.groups = groups.filter(
      (g) => contains(g.name) || contains(g.description),
    )
  }
  if (type === 'all' || type === 'posts') {
    const posts = await prisma.post.findMany({
      take: 30,
      include: { author: true },
      orderBy: { createdAt: 'desc' },
    })
    result.posts = posts
      .filter((p) => contains(p.content))
      .map((p) => ({ id: p.id, content: p.content, author: toPublicUser(p.author) }))
  }
  if (type === 'all' || type === 'pages') {
    const pages = await prisma.page.findMany()
    result.pages = pages.filter(
      (p) => contains(p.name) || contains(p.category) || contains(p.description),
    )
  }
  res.json(result)
})
