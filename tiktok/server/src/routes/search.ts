import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { enrichVideo } from '../services/videos.js'
import { serializeSound, soundInclude } from '../services/sounds.js'

export const searchRouter = Router()
searchRouter.use(requireAuth)

searchRouter.get('/', async (req: AuthRequest, res) => {
  const q = String(req.query.q ?? '').toLowerCase()
  const type = String(req.query.type ?? 'all')
  if (!q) return res.json({})
  const contains = (s: string) => s.toLowerCase().includes(q)
  const result: Record<string, unknown> = {}

  if (type === 'all' || type === 'users') {
    const users = await prisma.user.findMany({ take: 50 })
    result.users = users
      .filter((u) => contains(`${u.firstName} ${u.lastName}`) || contains(u.username))
      .map(toPublicUser)
  }
  if (type === 'all' || type === 'videos') {
    const videos = await prisma.video.findMany({ take: 30, include: { author: true } })
    const matched = []
    for (const v of videos.filter((x) => contains(x.caption))) {
      const e = await enrichVideo(v.id, req.userId!)
      if (e) matched.push(e)
    }
    result.videos = matched
  }
  if (type === 'all' || type === 'hashtags') {
    const tags = await prisma.hashtag.findMany({ take: 20 })
    result.hashtags = tags.filter((h) => contains(h.tag)).map((h) => ({ tag: h.tag }))
  }
  if (type === 'all' || type === 'sounds') {
    const sounds = await prisma.sound.findMany({ take: 50, include: soundInclude(req.userId!) })
    result.sounds = sounds.filter((s) => contains(s.title) || contains(s.artist)).slice(0, 20).map(serializeSound)
  }
  if (type === 'all' || type === 'groups') {
    const groups = await prisma.group.findMany()
    result.groups = groups.filter((g) => contains(g.name) || contains(g.description))
  }
  if (type === 'all' || type === 'posts') {
    const posts = await prisma.post.findMany({ take: 20, include: { author: true } })
    result.posts = posts
      .filter((p) => contains(p.content))
      .map((p) => ({ id: p.id, content: p.content, author: toPublicUser(p.author) }))
  }
  res.json(result)
})
