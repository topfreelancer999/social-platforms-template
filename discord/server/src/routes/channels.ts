import { Router, type Response } from 'express'
import { ChannelType } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { zodMessage } from '../lib/validation.js'
import { getChannelAccess, getServerAccess, serializeRole } from '../lib/access.js'
import { Permissions, canChangeBits, has, parseBits } from '../lib/permissions.js'
import { emitToChannel, emitToServer, resetChannelRooms } from '../lib/realtime.js'

export const channelsRouter = Router()
channelsRouter.use(requireAuth)

export const NO_SEND_MESSAGE = 'You do not have permission to send messages in this channel'
const NO_ACCESS = 'Missing access to this channel'

const messageSchema = z.object({ content: z.string().trim().min(1, 'Content required').max(2000) })
const channelName = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(100)
  .transform((s) => s.toLowerCase().replace(/\s+/g, '-'))
const createChannelSchema = z.object({
  name: channelName.optional(),
  type: z.nativeEnum(ChannelType).optional(),
  topic: z.string().max(1024).optional(),
})
const updateChannelSchema = z.object({ name: channelName.optional(), topic: z.string().max(1024).optional() })
const bitfield = z.string().regex(/^\d{1,20}$/, 'Must be a decimal permission bitfield')
const overwriteSchema = z.object({
  type: z.enum(['role', 'member']),
  targetId: z.string().min(1),
  allow: bitfield,
  deny: bitfield,
})

/** Shared loader: 404 unknown channel, 403 non-member or no VIEW_CHANNEL. */
async function loadChannel(req: AuthRequest, res: Response) {
  const ctx = await getChannelAccess(param(req, 'channelId'), req.userId!)
  if (!ctx.channel) {
    res.status(404).json({ message: 'Channel not found' })
    return null
  }
  if (!ctx.access || !has(ctx.perms, Permissions.VIEW_CHANNEL)) {
    res.status(403).json({ message: NO_ACCESS })
    return null
  }
  return { channel: ctx.channel, access: ctx.access, perms: ctx.perms }
}

function serializeMessage(m: { id: string; content: string; createdAt: Date; channelId: string; author: Parameters<typeof toPublicUser>[0] }) {
  return { id: m.id, content: m.content, createdAt: m.createdAt, channelId: m.channelId, author: toPublicUser(m.author) }
}

channelsRouter.get('/:channelId/messages', async (req: AuthRequest, res) => {
  const ctx = await loadChannel(req, res)
  if (!ctx) return
  const { channel, perms } = ctx
  const limit = Math.min(Number(req.query.limit) || 50, 100)
  // Without READ_MESSAGE_HISTORY the channel is visible but its backlog is not.
  const messages = has(perms, Permissions.READ_MESSAGE_HISTORY)
    ? await prisma.channelMessage.findMany({
        where: { channelId: channel.id },
        orderBy: { createdAt: 'asc' },
        take: limit,
        include: { author: true },
      })
    : []
  res.json({
    channel: { id: channel.id, name: channel.name, type: channel.type, topic: channel.topic, serverId: channel.serverId },
    myPermissions: perms.toString(),
    messages: messages.map(serializeMessage),
  })
})

channelsRouter.get('/:channelId/permissions/me', async (req: AuthRequest, res) => {
  const ctx = await getChannelAccess(param(req, 'channelId'), req.userId!)
  if (!ctx.channel) return res.status(404).json({ message: 'Channel not found' })
  if (!ctx.access) return res.status(403).json({ message: 'Not a member of this server' })
  const names = (Object.keys(Permissions) as (keyof typeof Permissions)[]).filter((k) => has(ctx.perms, Permissions[k]))
  res.json({ channelId: ctx.channel.id, permissions: ctx.perms.toString(), names })
})

channelsRouter.post('/:channelId/messages', async (req: AuthRequest, res) => {
  const body = messageSchema.safeParse(req.body ?? {})
  if (!body.success) return res.status(400).json({ message: zodMessage(body.error) })
  const ctx = await loadChannel(req, res)
  if (!ctx) return
  if (ctx.channel.type === ChannelType.VOICE) {
    return res.status(400).json({ message: 'Cannot post in voice channel' })
  }
  if (!has(ctx.perms, Permissions.SEND_MESSAGES)) return res.status(403).json({ message: NO_SEND_MESSAGE })
  const msg = await prisma.channelMessage.create({
    data: { channelId: ctx.channel.id, authorId: req.userId!, content: body.data.content },
    include: { author: true },
  })
  const payload = serializeMessage(msg)
  emitToChannel(ctx.channel.id, 'channel:message', payload)
  res.status(201).json({ message: payload })
})

channelsRouter.delete('/:channelId/messages/:messageId', async (req: AuthRequest, res) => {
  const ctx = await loadChannel(req, res)
  if (!ctx) return
  const msg = await prisma.channelMessage.findFirst({
    where: { id: param(req, 'messageId'), channelId: ctx.channel.id },
  })
  if (!msg) return res.status(404).json({ message: 'Message not found' })
  if (msg.authorId !== req.userId && !has(ctx.perms, Permissions.MANAGE_MESSAGES)) {
    return res.status(403).json({ message: 'You need the Manage Messages permission' })
  }
  await prisma.channelMessage.delete({ where: { id: msg.id } })
  emitToChannel(ctx.channel.id, 'channel:message:delete', { id: msg.id, channelId: ctx.channel.id })
  res.status(204).end()
})

channelsRouter.post('/server/:serverId', async (req: AuthRequest, res) => {
  const serverId = param(req, 'serverId')
  const access = await getServerAccess(serverId, req.userId!)
  if (!access) return res.status(403).json({ message: 'Not a member of this server' })
  if (!has(access.base, Permissions.MANAGE_CHANNELS)) {
    return res.status(403).json({ message: 'You need the Manage Channels permission' })
  }
  const body = createChannelSchema.safeParse(req.body ?? {})
  if (!body.success) return res.status(400).json({ message: zodMessage(body.error) })
  const maxPos = await prisma.channel.aggregate({
    where: { serverId },
    _max: { position: true },
  })
  const channel = await prisma.channel.create({
    data: {
      serverId,
      name: body.data.name ?? 'new-channel',
      type: body.data.type ?? ChannelType.TEXT,
      topic: body.data.topic ?? '',
      position: (maxPos._max.position ?? -1) + 1,
    },
  })
  emitToServer(serverId, 'channels:update', { channelId: channel.id })
  res.status(201).json({ channel })
})

channelsRouter.patch('/:channelId', async (req: AuthRequest, res) => {
  const ctx = await loadChannel(req, res)
  if (!ctx) return
  if (!has(ctx.perms, Permissions.MANAGE_CHANNELS)) {
    return res.status(403).json({ message: 'You need the Manage Channels permission' })
  }
  const body = updateChannelSchema.safeParse(req.body ?? {})
  if (!body.success) return res.status(400).json({ message: zodMessage(body.error) })
  const channel = await prisma.channel.update({ where: { id: ctx.channel.id }, data: body.data })
  emitToServer(channel.serverId, 'channels:update', { channelId: channel.id })
  res.json({ channel })
})

/** "Manage Permissions" on a channel is MANAGE_ROLES evaluated with the channel's overwrites. */
async function loadManageable(req: AuthRequest, res: Response) {
  const ctx = await loadChannel(req, res)
  if (!ctx) return null
  if (!has(ctx.perms, Permissions.MANAGE_ROLES)) {
    res.status(403).json({ message: 'You need the Manage Permissions permission for this channel' })
    return null
  }
  return ctx
}

channelsRouter.get('/:channelId/overwrites', async (req: AuthRequest, res) => {
  const ctx = await loadManageable(req, res)
  if (!ctx) return
  const { channel, access, perms } = ctx
  const members = await prisma.serverMember.findMany({
    where: { serverId: channel.serverId },
    include: { user: true, roles: { select: { roleId: true } } },
    orderBy: { joinedAt: 'asc' },
  })
  const byUser = new Map(members.map((m) => [m.userId, m]))
  const byRole = new Map(access.allRoles.map((r) => [r.id, r]))
  res.json({
    channel: { id: channel.id, name: channel.name, type: channel.type, topic: channel.topic, serverId: channel.serverId },
    overwrites: channel.overwrites
      .filter((o) => (o.roleId ? byRole.has(o.roleId) : o.userId ? byUser.has(o.userId) : false))
      .map((o) => ({
        id: o.id,
        type: o.roleId ? 'role' : 'member',
        targetId: (o.roleId ?? o.userId)!,
        allow: o.allow,
        deny: o.deny,
      })),
    roles: access.allRoles.map((r) => serializeRole(r)),
    members: members.map((m) => ({ user: toPublicUser(m.user), roleIds: m.roles.map((r) => r.roleId) })),
    myPermissions: perms.toString(),
    myHighest: access.highest,
    isOwner: access.isOwner,
  })
})

channelsRouter.put('/:channelId/overwrites', async (req: AuthRequest, res) => {
  const body = overwriteSchema.safeParse(req.body ?? {})
  if (!body.success) return res.status(400).json({ message: zodMessage(body.error) })
  const ctx = await loadManageable(req, res)
  if (!ctx) return
  const { channel, access, perms } = ctx
  const { type, targetId } = body.data
  const allow = parseBits(body.data.allow)
  const deny = parseBits(body.data.deny)
  if ((allow & deny) !== 0n) return res.status(400).json({ message: 'A permission cannot be both allowed and denied' })

  if (type === 'role') {
    const role = access.allRoles.find((r) => r.id === targetId)
    if (!role) return res.status(404).json({ message: 'Role not found' })
    if (!access.isOwner && !role.isEveryone && role.position >= access.highest) {
      return res.status(403).json({ message: 'You can only edit overwrites for roles below your highest role' })
    }
  } else {
    const member = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId: channel.serverId, userId: targetId } },
    })
    if (!member) return res.status(404).json({ message: 'Member not found' })
  }

  const existing = channel.overwrites.find((o) => (type === 'role' ? o.roleId === targetId : o.userId === targetId))
  const beforeAllow = parseBits(existing?.allow)
  const beforeDeny = parseBits(existing?.deny)
  if (!canChangeBits(perms, beforeAllow, allow) || !canChangeBits(perms, beforeDeny, deny)) {
    return res.status(403).json({ message: 'You cannot change permissions you do not have in this channel' })
  }

  const data = { allow: allow.toString(), deny: deny.toString() }
  const overwrite = existing
    ? await prisma.channelPermissionOverwrite.update({ where: { id: existing.id }, data })
    : await prisma.channelPermissionOverwrite.create({
        data: { channelId: channel.id, ...(type === 'role' ? { roleId: targetId } : { userId: targetId }), ...data },
      })
  emitToServer(channel.serverId, 'channels:update', { channelId: channel.id })
  resetChannelRooms([channel.id])
  res.json({
    overwrite: { id: overwrite.id, type, targetId, allow: overwrite.allow, deny: overwrite.deny },
  })
})

channelsRouter.delete('/:channelId/overwrites/:overwriteId', async (req: AuthRequest, res) => {
  const ctx = await loadManageable(req, res)
  if (!ctx) return
  const { channel, access, perms } = ctx
  const ow = channel.overwrites.find((o) => o.id === param(req, 'overwriteId'))
  if (!ow) return res.status(404).json({ message: 'Overwrite not found' })
  if (ow.roleId && !access.isOwner) {
    const role = access.allRoles.find((r) => r.id === ow.roleId)
    if (role && !role.isEveryone && role.position >= access.highest) {
      return res.status(403).json({ message: 'You can only edit overwrites for roles below your highest role' })
    }
  }
  if (!canChangeBits(perms, parseBits(ow.allow), 0n) || !canChangeBits(perms, parseBits(ow.deny), 0n)) {
    return res.status(403).json({ message: 'You cannot change permissions you do not have in this channel' })
  }
  await prisma.channelPermissionOverwrite.delete({ where: { id: ow.id } })
  emitToServer(channel.serverId, 'channels:update', { channelId: channel.id })
  resetChannelRooms([channel.id])
  res.status(204).end()
})
