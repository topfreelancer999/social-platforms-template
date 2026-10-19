import { Router } from 'express'
import { ChannelType, ServerRole } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { getServerAccess, serializeRole, visibleChannels } from '../lib/access.js'
import { DEFAULT_EVERYONE_PERMISSIONS, Permissions } from '../lib/permissions.js'
import { emitToServer, joinUserToServer, removeUserFromServer } from '../lib/realtime.js'

export const serversRouter = Router()
serversRouter.use(requireAuth)

serversRouter.get('/', async (req: AuthRequest, res) => {
  const memberships = await prisma.serverMember.findMany({
    where: { userId: req.userId! },
    include: { server: { include: { _count: { select: { members: true } } } } },
    orderBy: { joinedAt: 'asc' },
  })
  const servers = []
  for (const m of memberships) {
    const access = await getServerAccess(m.serverId, req.userId!)
    const { _count, ...server } = m.server
    servers.push({
      ...server,
      // Only channels this member can see (VIEW_CHANNEL after overwrites).
      channels: access ? await visibleChannels(access) : [],
      role: m.role,
      memberCount: _count.members,
    })
  }
  res.json({ servers })
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
      roles: {
        create: {
          name: '@everyone',
          position: 0,
          isEveryone: true,
          permissions: DEFAULT_EVERYONE_PERMISSIONS.toString(),
        },
      },
      channels: {
        create: [
          { name: 'general', topic: 'General', position: 0 },
          { name: 'announcements', topic: 'Announcements', type: ChannelType.ANNOUNCEMENT, position: 1 },
        ],
      },
    },
    include: { channels: { orderBy: { position: 'asc' } }, roles: true },
  })
  // Announcement channels are read-only for @everyone by default (owner still posts).
  const announcements = server.channels.find((c) => c.type === ChannelType.ANNOUNCEMENT)
  if (announcements) {
    await prisma.channelPermissionOverwrite.create({
      data: {
        channelId: announcements.id,
        roleId: server.roles[0].id,
        deny: Permissions.SEND_MESSAGES.toString(),
      },
    })
  }
  joinUserToServer(req.userId!, server.id)
  const { roles: _roles, ...rest } = server
  res.status(201).json({ server: rest })
})

serversRouter.get('/:id', async (req: AuthRequest, res) => {
  const id = param(req, 'id')
  const access = await getServerAccess(id, req.userId!)
  if (!access) {
    const exists = await prisma.server.count({ where: { id } })
    return exists ? res.status(403).json({ message: 'Not a member' }) : res.status(404).json({ message: 'Not found' })
  }
  const server = await prisma.server.findUnique({
    where: { id },
    include: {
      members: { include: { user: true, roles: { select: { roleId: true } } }, orderBy: { joinedAt: 'asc' } },
    },
  })
  if (!server) return res.status(404).json({ message: 'Not found' })
  const counts = new Map<string, number>()
  for (const m of server.members) {
    for (const r of m.roles) counts.set(r.roleId, (counts.get(r.roleId) ?? 0) + 1)
  }
  res.json({
    server: {
      id: server.id,
      name: server.name,
      description: server.description,
      iconUrl: server.iconUrl,
      ownerId: server.ownerId,
      channels: await visibleChannels(access),
      roles: access.allRoles.map((r) =>
        serializeRole(r, r.isEveryone ? server.members.length : counts.get(r.id) ?? 0),
      ),
      members: server.members.map((m) => ({
        role: m.role,
        roleIds: m.roles.map((r) => r.roleId),
        user: toPublicUser(m.user),
      })),
      myRole: access.member.role,
      myPermissions: access.base.toString(),
      myHighest: access.highest,
      isOwner: access.isOwner,
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
  joinUserToServer(req.userId!, id)
  emitToServer(id, 'members:update')
  res.json({ ok: true })
})

serversRouter.post('/:id/leave', async (req: AuthRequest, res) => {
  const id = param(req, 'id')
  await prisma.serverMember.deleteMany({
    where: { serverId: id, userId: req.userId!, role: { not: ServerRole.OWNER } },
  })
  const channels = await prisma.channel.findMany({ where: { serverId: id }, select: { id: true } })
  removeUserFromServer(req.userId!, id, channels.map((c) => c.id))
  emitToServer(id, 'members:update')
  res.json({ ok: true })
})
