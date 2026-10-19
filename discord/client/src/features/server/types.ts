import { P, has } from '@/lib/permissions'

export type UserSummary = {
  id: string
  username: string
  displayName?: string
  firstName: string
  avatarUrl: string
  status?: string
}

export type Role = {
  id: string
  name: string
  color: number
  position: number
  permissions: string
  hoist: boolean
  mentionable: boolean
  isEveryone: boolean
  memberCount?: number
}

export type Channel = {
  id: string
  name: string
  type: string
  topic?: string
  /** Caller's effective permissions in this channel (decimal bitfield). */
  permissions?: string
  isPrivate?: boolean
}

export type Member = { role: string; roleIds: string[]; user: UserSummary }

export type ServerDetail = {
  id: string
  name: string
  description: string
  iconUrl: string
  ownerId: string
  channels: Channel[]
  roles: Role[]
  members: Member[]
  myPermissions: string
  myHighest: number
  isOwner: boolean
}

export const displayName = (u: UserSummary) => u.displayName || u.firstName

/** Roles of a member sorted highest-first (excluding @everyone). */
export function memberRoles(member: Pick<Member, 'roleIds'>, roles: Role[]) {
  const ids = new Set(member.roleIds)
  return roles.filter((r) => !r.isEveryone && ids.has(r.id)).sort((a, b) => b.position - a.position)
}

/** Name colour = highest role that actually has a colour (Discord rule). */
export function memberColor(member: Pick<Member, 'roleIds'> | undefined, roles: Role[]) {
  if (!member) return undefined
  return memberRoles(member, roles).find((r) => r.color !== 0)?.color
}

/** Whether the viewer may edit/assign a role (MANAGE_ROLES + strictly below their highest role). */
export function canManageRole(server: Pick<ServerDetail, 'isOwner' | 'myPermissions' | 'myHighest'>, role: Role) {
  if (server.isOwner) return true
  if (!has(server.myPermissions, P.MANAGE_ROLES)) return false
  return role.position < server.myHighest
}
