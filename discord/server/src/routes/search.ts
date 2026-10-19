import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { viewableChannelIds } from '../lib/access.js'

export const searchRouter = Router()
searchRouter.use(requireAuth)

searchRouter.get('/', async (req: AuthRequest, res) => {
  const q = String(req.query.q ?? '').toLowerCase()
  const type = String(req.query.type ?? 'all')
  if (!q) return res.json({})
  const contains = (s: string) => s.toLowerCase().includes(q)
  const result: Record<string, unknown> = {}
  // Channels and messages respect VIEW_CHANNEL, so private channels never leak via search.
  const needsChannels = ['all', 'channels', 'messages'].includes(type)
  const viewable = needsChannels ? await viewableChannelIds(req.userId!) : new Set<string>()

  if (type === 'all' || type === 'servers') {
    const servers = await prisma.server.findMany({ take: 30, include: { _count: { select: { members: true } } } })
    result.servers = servers
      .filter((s) => contains(s.name) || contains(s.description))
      .map((s) => ({ id: s.id, name: s.name, description: s.description, iconUrl: s.iconUrl, memberCount: s._count.members }))
  }
  if (type === 'all' || type === 'channels') {
    const channels = await prisma.channel.findMany({ where: { id: { in: [...viewable] } }, take: 50, include: { server: true } })
    result.channels = channels
      .filter((c) => contains(c.name) || contains(c.topic))
      .map((c) => ({ id: c.id, name: c.name, serverId: c.serverId, serverName: c.server.name }))
  }
  if (type === 'all' || type === 'users') {
    const users = await prisma.user.findMany({ take: 50 })
    result.users = users
      .filter((u) => contains(u.displayName) || contains(u.username) || contains(`${u.firstName} ${u.lastName}`))
      .map(toPublicUser)
  }
  if (type === 'all' || type === 'groups') {
    result.groups = (await prisma.group.findMany()).filter(
      (g) => contains(g.name) || contains(g.description),
    )
  }
  if (type === 'all' || type === 'messages') {
    const msgs = await prisma.channelMessage.findMany({ where: { channelId: { in: [...viewable] } }, take: 40, include: { author: true, channel: { include: { server: true } } } })
    result.messages = msgs
      .filter((m) => contains(m.content))
      .map((m) => ({
        id: m.id,
        content: m.content,
        channelId: m.channelId,
        channelName: m.channel.name,
        serverId: m.channel.serverId,
        serverName: m.channel.server.name,
        author: toPublicUser(m.author),
      }))
  }
  res.json(result)
})
