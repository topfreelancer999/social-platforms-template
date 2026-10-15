import { Router } from 'express'
import { ChannelType } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'

export const channelsRouter = Router()
channelsRouter.use(requireAuth)

async function assertMember(serverId: string, userId: string) {
  return prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  })
}

channelsRouter.get('/:channelId/messages', async (req: AuthRequest, res) => {
  const channelId = param(req, 'channelId')
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    include: { server: true },
  })
  if (!channel) return res.status(404).json({ message: 'Not found' })
  const member = await assertMember(channel.serverId, req.userId!)
  if (!member) return res.status(403).json({ message: 'Forbidden' })
  const limit = Math.min(Number(req.query.limit) || 50, 100)
  const messages = await prisma.channelMessage.findMany({
    where: { channelId },
    orderBy: { createdAt: 'asc' },
    take: limit,
    include: { author: true },
  })
  res.json({
    channel: { id: channel.id, name: channel.name, type: channel.type, serverId: channel.serverId },
    messages: messages.map((m) => ({
      id: m.id,
      content: m.content,
      createdAt: m.createdAt,
      author: toPublicUser(m.author),
    })),
  })
})

channelsRouter.post('/:channelId/messages', async (req: AuthRequest, res) => {
  const channelId = param(req, 'channelId')
  const { content } = req.body as { content: string }
  if (!content?.trim()) return res.status(400).json({ message: 'Content required' })
  const channel = await prisma.channel.findUnique({ where: { id: channelId } })
  if (!channel) return res.status(404).json({ message: 'Not found' })
  if (channel.type === ChannelType.VOICE) {
    return res.status(400).json({ message: 'Cannot post in voice channel' })
  }
  const member = await assertMember(channel.serverId, req.userId!)
  if (!member) return res.status(403).json({ message: 'Forbidden' })
  const msg = await prisma.channelMessage.create({
    data: { channelId, authorId: req.userId!, content: content.trim() },
    include: { author: true },
  })
  res.status(201).json({
    message: {
      id: msg.id,
      content: msg.content,
      createdAt: msg.createdAt,
      author: toPublicUser(msg.author),
    },
  })
})

channelsRouter.post('/server/:serverId', async (req: AuthRequest, res) => {
  const serverId = param(req, 'serverId')
  const { name, type, topic } = req.body as { name: string; type?: ChannelType; topic?: string }
  const member = await assertMember(serverId, req.userId!)
  if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
    return res.status(403).json({ message: 'Admin only' })
  }
  const maxPos = await prisma.channel.aggregate({
    where: { serverId },
    _max: { position: true },
  })
  const channel = await prisma.channel.create({
    data: {
      serverId,
      name: (name || 'new-channel').toLowerCase().replace(/\s+/g, '-'),
      type: type ?? ChannelType.TEXT,
      topic: topic ?? '',
      position: (maxPos._max.position ?? -1) + 1,
    },
  })
  res.status(201).json({ channel })
})
