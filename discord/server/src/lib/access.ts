import type { ChannelPermissionOverwrite, Role, ServerMember } from '@prisma/client'
import { prisma } from './prisma.js'
import {
  DEFAULT_EVERYONE_PERMISSIONS,
  Permissions,
  computeBasePermissions,
  computeChannelPermissions,
  has,
  parseBits,
  type OverwriteLike,
  type PermissionSubject,
} from './permissions.js'

/** Database glue around the pure permission math in permissions.ts. */

export interface ServerAccess {
  serverId: string
  userId: string
  isOwner: boolean
  member: ServerMember
  everyone: Role
  /** Every role in the server, highest position first. */
  allRoles: Role[]
  /** Roles assigned to this member (never includes @everyone). */
  memberRoles: Role[]
  base: bigint
  /** Position of the member's highest role; owner outranks everything. */
  highest: number
  subject: PermissionSubject
}

/** Servers created before roles existed get their @everyone role lazily. */
export async function ensureEveryoneRole(serverId: string) {
  const existing = await prisma.role.findFirst({ where: { serverId, isEveryone: true } })
  if (existing) return existing
  return prisma.role.create({
    data: {
      serverId,
      name: '@everyone',
      position: 0,
      isEveryone: true,
      permissions: DEFAULT_EVERYONE_PERMISSIONS.toString(),
    },
  })
}

export async function getServerAccess(serverId: string, userId: string): Promise<ServerAccess | null> {
  const [server, member] = await Promise.all([
    prisma.server.findUnique({ where: { id: serverId }, select: { ownerId: true } }),
    prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId } },
      include: { roles: { select: { roleId: true } } },
    }),
  ])
  if (!server || !member) return null
  await ensureEveryoneRole(serverId)
  const allRoles = await prisma.role.findMany({ where: { serverId }, orderBy: { position: 'desc' } })
  const everyone = allRoles.find((r) => r.isEveryone)!
  const assigned = new Set(member.roles.map((r) => r.roleId))
  const memberRoles = allRoles.filter((r) => !r.isEveryone && assigned.has(r.id))
  const isOwner = server.ownerId === userId
  const subject: PermissionSubject = {
    userId,
    isOwner,
    everyone: { id: everyone.id, permissions: parseBits(everyone.permissions) },
    roles: memberRoles.map((r) => ({ id: r.id, permissions: parseBits(r.permissions) })),
  }
  return {
    serverId,
    userId,
    isOwner,
    member,
    everyone,
    allRoles,
    memberRoles,
    base: computeBasePermissions(subject),
    highest: isOwner ? Number.MAX_SAFE_INTEGER : Math.max(0, ...memberRoles.map((r) => r.position)),
    subject,
  }
}

export function toOverwriteLike(ow: ChannelPermissionOverwrite): OverwriteLike {
  return { roleId: ow.roleId, userId: ow.userId, allow: parseBits(ow.allow), deny: parseBits(ow.deny) }
}

export function channelPermissions(access: ServerAccess, overwrites: ChannelPermissionOverwrite[]) {
  return computeChannelPermissions(access.subject, overwrites.map(toOverwriteLike))
}

/** Load a channel plus the caller's effective permissions in it (null if not a member). */
export async function getChannelAccess(channelId: string, userId: string) {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    include: { overwrites: true },
  })
  if (!channel) return { channel: null, access: null, perms: 0n } as const
  const access = await getServerAccess(channel.serverId, userId)
  const perms = access ? channelPermissions(access, channel.overwrites) : 0n
  return { channel, access, perms } as const
}

/** Hierarchy rule: MANAGE_ROLES plus the role must sit strictly below your highest role. */
export function canManageRole(access: ServerAccess, role: Pick<Role, 'position' | 'isEveryone'>) {
  if (access.isOwner) return true
  if (!has(access.base, Permissions.MANAGE_ROLES)) return false
  return role.position < access.highest
}

/** Channel ids the user may view across all servers they belong to (for search). */
export async function viewableChannelIds(userId: string) {
  const memberships = await prisma.serverMember.findMany({ where: { userId }, select: { serverId: true } })
  const ids = new Set<string>()
  for (const { serverId } of memberships) {
    const access = await getServerAccess(serverId, userId)
    if (!access) continue
    for (const c of await visibleChannels(access)) ids.add(c.id)
  }
  return ids
}

/** Channels of a server the given access can see, each annotated with its effective permissions. */
export async function visibleChannels(access: ServerAccess) {
  const channels = await prisma.channel.findMany({
    where: { serverId: access.serverId },
    include: { overwrites: true },
    orderBy: { position: 'asc' },
  })
  return channels
    .map((c) => {
      const perms = channelPermissions(access, c.overwrites)
      const everyoneOw = c.overwrites.find((o) => o.roleId === access.everyone.id)
      const { overwrites: _overwrites, ...rest } = c
      return {
        ...rest,
        permissions: perms,
        // Discord shows a lock on channels hidden from @everyone.
        isPrivate: !!everyoneOw && has(parseBits(everyoneOw.deny), Permissions.VIEW_CHANNEL),
      }
    })
    .filter((c) => has(c.permissions, Permissions.VIEW_CHANNEL))
    .map((c) => ({ ...c, permissions: c.permissions.toString() }))
}

export function serializeRole(role: Role, memberCount?: number) {
  return {
    id: role.id,
    name: role.name,
    color: role.color,
    position: role.position,
    permissions: role.permissions,
    hoist: role.hoist,
    mentionable: role.mentionable,
    isEveryone: role.isEveryone,
    ...(memberCount === undefined ? {} : { memberCount }),
  }
}
