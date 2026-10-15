import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { enrichVideo } from '../services/videos.js'

export const searchRouter = Router()
searchRouter.use(requireAuth)

searchRouter.get('/', async (req: AuthRequest, res) => {
  const q = String(req.query.q ?? '').toLowerCase()
  const type = String(req.query.type ?? 'all')
  if (!q) return res.json({})
  const contains = (s: string) => s.toLowerCase().includes(q)
  const result: Record<string, unknown> = {}

  if (type === 'all' || type === 'videos') {
    const videos = await prisma.video.findMany({ where: { published: true }, take: 30 })
    const matched = []
    for (const v of videos.filter((x) => contains(x.title) || contains(x.description))) {
      const e = await enrichVideo(v.id, req.userId!)
      if (e) matched.push(e)
    }
    result.videos = matched
  }
  if (type === 'all' || type === 'channels') {
    const users = await prisma.user.findMany({ take: 50 })
    result.channels = users
      .filter((u) => contains(u.channelName) || contains(u.username) || contains(`${u.firstName} ${u.lastName}`))
      .map((u) => ({ ...toPublicUser(u), channelName: u.channelName || u.firstName }))
  }
  if (type === 'all' || type === 'groups') {
    result.groups = (await prisma.group.findMany()).filter(
      (g) => contains(g.name) || contains(g.description),
    )
  }
  if (type === 'all' || type === 'posts') {
    const posts = await prisma.post.findMany({ take: 20, include: { author: true } })
    result.posts = posts.filter((p) => contains(p.content)).map((p) => ({
      id: p.id,
      content: p.content,
      author: toPublicUser(p.author),
    }))
  }
  res.json(result)
})
