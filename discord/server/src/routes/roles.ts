import { Router, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { zodMessage } from '../lib/validation.js'
import { canManageRole, getServerAccess, serializeRole, type ServerAccess } from '../lib/access.js'
import { Permissions, canChangeBits, has, parseBits } from '../lib/permissions.js'
import { emitToServer, resetChannelRooms } from '../lib/realtime.js'

/** Mounted at /servers/:serverId — role CRUD, ordering and member assignment. */
export const rolesRouter = Router({ mergeParams: true })
rolesRouter.use(requireAuth)

const bitfield = z.string().regex(/^\d{1,20}$/, 'Must be a decimal permission bitfield')

const roleBody = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  color: z.number().int().min(0).max(0xffffff),
  permissions: bitfield,
  hoist: z.boolean(),
  mentionable: z.boolean(),
})

const createSchema = roleBody.partial()
const updateSchema = roleBody.partial()
const reorderSchema = z.object({ roleIds: z.array(z.string().min(1)).min(1) })

const NO_MANAGE = 'You need the Manage Roles permission'
const TOO_HIGH = 'You can only manage roles below your highest role'

/** Load caller access or send the right error; returns null when a response was sent. */
async function loadAccess(req: AuthRequest, res: Response) {
  const access = await getServerAccess(param(req, 'serverId'), req.userId!)
  if (!access) {
    const exists = await prisma.server.count({ where: { id: param(req, 'serverId') } })
    res.status(exists ? 403 : 404).json({ message: exists ? 'Not a member of this server' : 'Server not found' })
    return null
  }
  return access
}

function requireManageRoles(access: ServerAccess, res: Response) {
  if (access.isOwner || has(access.base, Permissions.MANAGE_ROLES)) return true
  res.status(403).json({ message: NO_MANAGE })
  return false
}

async function roleCounts(serverId: string) {
  const counts = await prisma.memberRole.groupBy({
    by: ['roleId'],
    where: { role: { serverId } },
    _count: { _all: true },
  })
  return new Map(counts.map((c) => [c.roleId, c._count._all]))
}

/** Roles changed → everyone in the server refetches, and channel rooms are re-checked. */
async function broadcastRoles(serverId: string) {
  emitToServer(serverId, 'roles:update')
  const channels = await prisma.channel.findMany({ where: { serverId }, select: { id: true } })
  resetChannelRooms(channels.map((c) => c.id))
}

rolesRouter.get('/roles', async (req: AuthRequest, res) => {
  const access = await loadAccess(req, res)
  if (!access) return
  const [counts, memberTotal] = await Promise.all([
    roleCounts(access.serverId),
    prisma.serverMember.count({ where: { serverId: access.serverId } }),
  ])
  res.json({
    roles: access.allRoles.map((r) => serializeRole(r, r.isEveryone ? memberTotal : counts.get(r.id) ?? 0)),
    myPermissions: access.base.toString(),
    myHighest: access.highest,
    isOwner: access.isOwner,
  })
})

rolesRouter.post('/roles', async (req: AuthRequest, res) => {
  const access = await loadAccess(req, res)
  if (!access || !requireManageRoles(access, res)) return
  const body = createSchema.safeParse(req.body ?? {})
  if (!body.success) return res.status(400).json({ message: zodMessage(body.error) })
  const perms = parseBits(body.data.permissions ?? '0')
  if (!canChangeBits(access.base, 0n, perms)) {
    return res.status(403).json({ message: 'You cannot grant permissions you do not have' })
  }
  // Discord adds new roles at the bottom of the hierarchy, just above @everyone.
  const role = await prisma.$transaction(async (tx) => {
    await tx.role.updateMany({
      where: { serverId: access.serverId, isEveryone: false },
      data: { position: { increment: 1 } },
    })
    return tx.role.create({
      data: {
        serverId: access.serverId,
        name: body.data.name ?? 'new role',
        color: body.data.color ?? 0,
        permissions: perms.toString(),
        hoist: body.data.hoist ?? false,
        mentionable: body.data.mentionable ?? false,
        position: 1,
      },
    })
  })
  await broadcastRoles(access.serverId)
  res.status(201).json({ role: serializeRole(role, 0) })
})

// Discord-style bulk position update: full list of non-@everyone role ids, highest first.
rolesRouter.patch('/roles', async (req: AuthRequest, res) => {
  const access = await loadAccess(req, res)
  if (!access || !requireManageRoles(access, res)) return
  const body = reorderSchema.safeParse(req.body)
  if (!body.success) return res.status(400).json({ message: zodMessage(body.error) })
  const roles = access.allRoles.filter((r) => !r.isEveryone)
  const ids = body.data.roleIds
  const known = new Set(roles.map((r) => r.id))
  if (ids.length !== roles.length || new Set(ids).size !== ids.length || ids.some((id) => !known.has(id))) {
    return res.status(400).json({ message: 'roleIds must list every role in the server exactly once' })
  }
  const next = new Map(ids.map((id, i) => [id, ids.length - i]))
  const changed = roles.filter((r) => next.get(r.id) !== r.position)
  if (!access.isOwner) {
    // Only roles strictly below you can move, and only to slots that are still below you.
    const violates = changed.some((r) => r.position >= access.highest || next.get(r.id)! >= access.highest)
    if (violates) return res.status(403).json({ message: TOO_HIGH })
  }
  await prisma.$transaction(
    changed.map((r) => prisma.role.update({ where: { id: r.id }, data: { position: next.get(r.id)! } })),
  )
  await broadcastRoles(access.serverId)
  const counts = await roleCounts(access.serverId)
  const updated = await prisma.role.findMany({ where: { serverId: access.serverId }, orderBy: { position: 'desc' } })
  res.json({ roles: updated.map((r) => serializeRole(r, counts.get(r.id) ?? 0)) })
})

rolesRouter.patch('/roles/:roleId', async (req: AuthRequest, res) => {
  const access = await loadAccess(req, res)
  if (!access || !requireManageRoles(access, res)) return
  const role = access.allRoles.find((r) => r.id === param(req, 'roleId'))
  if (!role) return res.status(404).json({ message: 'Role not found' })
  if (!canManageRole(access, role)) return res.status(403).json({ message: TOO_HIGH })
  const body = updateSchema.safeParse(req.body ?? {})
  if (!body.success) return res.status(400).json({ message: zodMessage(body.error) })
  if (role.isEveryone && body.data.name !== undefined && body.data.name !== role.name) {
    return res.status(400).json({ message: 'The @everyone role cannot be renamed' })
  }
  if (body.data.permissions !== undefined) {
    const before = parseBits(role.permissions)
    const after = parseBits(body.data.permissions)
    if (!canChangeBits(access.base, before, after)) {
      return res.status(403).json({ message: 'You cannot grant or revoke permissions you do not have' })
    }
    body.data.permissions = after.toString()
  }
  const updated = await prisma.role.update({
    where: { id: role.id },
    data: role.isEveryone
      ? { permissions: body.data.permissions }
      : body.data,
  })
  await broadcastRoles(access.serverId)
  res.json({ role: serializeRole(updated) })
})

rolesRouter.delete('/roles/:roleId', async (req: AuthRequest, res) => {
  const access = await loadAccess(req, res)
  if (!access || !requireManageRoles(access, res)) return
  const role = access.allRoles.find((r) => r.id === param(req, 'roleId'))
  if (!role) return res.status(404).json({ message: 'Role not found' })
  if (role.isEveryone) return res.status(400).json({ message: 'The @everyone role cannot be deleted' })
  if (!canManageRole(access, role)) return res.status(403).json({ message: TOO_HIGH })
  await prisma.$transaction([
    prisma.role.delete({ where: { id: role.id } }),
    // Close the gap so positions stay contiguous.
    prisma.role.updateMany({
      where: { serverId: access.serverId, position: { gt: role.position } },
      data: { position: { decrement: 1 } },
    }),
  ])
  await broadcastRoles(access.serverId)
  res.status(204).end()
})

async function memberRoleTarget(req: AuthRequest, res: Response) {
  const access = await loadAccess(req, res)
  if (!access || !requireManageRoles(access, res)) return null
  const role = access.allRoles.find((r) => r.id === param(req, 'roleId'))
  if (!role) {
    res.status(404).json({ message: 'Role not found' })
    return null
  }
  if (role.isEveryone) {
    res.status(400).json({ message: 'Everyone has the @everyone role implicitly' })
    return null
  }
  if (!canManageRole(access, role)) {
    res.status(403).json({ message: TOO_HIGH })
    return null
  }
  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId: access.serverId, userId: param(req, 'userId') } },
  })
  if (!member) {
    res.status(404).json({ message: 'Member not found' })
    return null
  }
  return { access, role, member }
}

rolesRouter.put('/members/:userId/roles/:roleId', async (req: AuthRequest, res) => {
  const target = await memberRoleTarget(req, res)
  if (!target) return
  await prisma.memberRole.upsert({
    where: { memberId_roleId: { memberId: target.member.id, roleId: target.role.id } },
    create: { memberId: target.member.id, roleId: target.role.id },
    update: {},
  })
  await broadcastRoles(target.access.serverId)
  res.status(204).end()
})

rolesRouter.delete('/members/:userId/roles/:roleId', async (req: AuthRequest, res) => {
  const target = await memberRoleTarget(req, res)
  if (!target) return
  await prisma.memberRole.deleteMany({ where: { memberId: target.member.id, roleId: target.role.id } })
  await broadcastRoles(target.access.serverId)
  res.status(204).end()
})
