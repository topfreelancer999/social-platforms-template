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
  if (type === 'all' || type === 'communities') {
    const communities = await prisma.community.findMany()
    result.communities = communities.filter(
      (c) => contains(c.name) || contains(c.description),
    )
  }
  if (type === 'all' || type === 'tweets') {
    const tweets = await prisma.tweet.findMany({
      take: 30,
      include: { author: true },
      orderBy: { createdAt: 'desc' },
    })
    result.tweets = tweets
      .filter((t) => contains(t.content))
      .map((t) => ({ id: t.id, content: t.content, author: toPublicUser(t.author) }))
  }
  if (type === 'all' || type === 'pages') {
    const pages = await prisma.page.findMany()
    result.pages = pages.filter(
      (p) => contains(p.name) || contains(p.category) || contains(p.description),
    )
  }
  if (type === 'all' || type === 'hashtags') {
    const tags = await prisma.hashtag.findMany({ take: 20 })
    result.hashtags = tags.filter((h) => contains(h.tag)).map((h) => ({ tag: h.tag }))
  }
  res.json(result)
})
