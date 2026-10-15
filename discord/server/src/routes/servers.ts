import { Router } from 'express'
import { ChannelType, ServerRole } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'

export const serversRouter = Router()
serversRouter.use(requireAuth)

serversRouter.get('/', async (req: AuthRequest, res) => {
  const memberships = await prisma.serverMember.findMany({
    where: { userId: req.userId! },
    include: {
      server: {
        include: {
          channels: { orderBy: { position: 'asc' } },
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  })
  res.json({
    servers: memberships.map((m) => ({
      ...m.server,
      role: m.role,
      memberCount: m.server._count.members,
    })),
  })
})

serversRouter.get('/discover', async (_req, res) => {
  const servers = await prisma.server.findMany({
    take: 20,
    include: { _count: { select: { members: true } }, owner: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json({
    servers: servers.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      iconUrl: s.iconUrl,
      memberCount: s._count.members,
      owner: toPublicUser(s.owner),
    })),
  })
})

serversRouter.post('/', async (req: AuthRequest, res) => {
  const { name, description } = req.body as { name: string; description?: string }
  if (!name?.trim()) return res.status(400).json({ message: 'Name required' })
  const server = await prisma.server.create({
    data: {
      name: name.trim(),
      description: description?.trim() ?? '',
      iconUrl: `https://picsum.photos/seed/${Date.now()}/96/96`,
      ownerId: req.userId!,
      members: { create: { userId: req.userId!, role: ServerRole.OWNER } },
      channels: {
        create: [
          { name: 'general', topic: 'General', position: 0 },
          { name: 'announcements', topic: 'Announcements', type: ChannelType.ANNOUNCEMENT, position: 1 },
        ],
      },
    },
    include: { channels: { orderBy: { position: 'asc' } } },
  })
  res.status(201).json({ server })
})

serversRouter.get('/:id', async (req: AuthRequest, res) => {
  const id = param(req, 'id')
  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId: id, userId: req.userId! } },
  })
  if (!member) return res.status(403).json({ message: 'Not a member' })
  const server = await prisma.server.findUnique({
    where: { id },
    include: {
      channels: { orderBy: { position: 'asc' } },
      members: { include: { user: true } },
    },
  })
  if (!server) return res.status(404).json({ message: 'Not found' })
  res.json({
    server: {
      id: server.id,
      name: server.name,
      description: server.description,
      iconUrl: server.iconUrl,
      ownerId: server.ownerId,
      channels: server.channels,
      members: server.members.map((m) => ({
        role: m.role,
        user: toPublicUser(m.user),
      })),
      myRole: member.role,
    },
  })
})

serversRouter.post('/:id/join', async (req: AuthRequest, res) => {
  const id = param(req, 'id')
  const server = await prisma.server.findUnique({ where: { id } })
  if (!server) return res.status(404).json({ message: 'Not found' })
  await prisma.serverMember.upsert({
    where: { serverId_userId: { serverId: id, userId: req.userId! } },
    create: { serverId: id, userId: req.userId! },
    update: {},
  })
  res.json({ ok: true })
})

serversRouter.post('/:id/leave', async (req: AuthRequest, res) => {
  const id = param(req, 'id')
  await prisma.serverMember.deleteMany({
    where: { serverId: id, userId: req.userId!, role: { not: ServerRole.OWNER } },
  })
  res.json({ ok: true })
})
