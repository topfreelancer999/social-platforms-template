/**
 * Pure Discord-style permission math. No database access lives here so the
 * algorithm can be reasoned about (and unit-checked) in isolation.
 * Bit values mirror Discord's own flags.
 */
export const Permissions = {
  CREATE_INSTANT_INVITE: 1n << 0n,
  KICK_MEMBERS: 1n << 1n,
  BAN_MEMBERS: 1n << 2n,
  ADMINISTRATOR: 1n << 3n,
  MANAGE_CHANNELS: 1n << 4n,
  MANAGE_GUILD: 1n << 5n,
  ADD_REACTIONS: 1n << 6n,
  VIEW_AUDIT_LOG: 1n << 7n,
  VIEW_CHANNEL: 1n << 10n,
  SEND_MESSAGES: 1n << 11n,
  MANAGE_MESSAGES: 1n << 13n,
  EMBED_LINKS: 1n << 14n,
  ATTACH_FILES: 1n << 15n,
  READ_MESSAGE_HISTORY: 1n << 16n,
  MENTION_EVERYONE: 1n << 17n,
  CONNECT: 1n << 20n,
  SPEAK: 1n << 21n,
  MUTE_MEMBERS: 1n << 22n,
  CHANGE_NICKNAME: 1n << 26n,
  MANAGE_NICKNAMES: 1n << 27n,
  MANAGE_ROLES: 1n << 28n,
} as const

export type PermissionName = keyof typeof Permissions

export const ALL_PERMISSIONS = Object.values(Permissions).reduce((acc, bit) => acc | bit, 0n)

/** What a freshly created server grants @everyone (close to Discord's defaults). */
export const DEFAULT_EVERYONE_PERMISSIONS =
  Permissions.CREATE_INSTANT_INVITE |
  Permissions.ADD_REACTIONS |
  Permissions.VIEW_CHANNEL |
  Permissions.SEND_MESSAGES |
  Permissions.EMBED_LINKS |
  Permissions.ATTACH_FILES |
  Permissions.READ_MESSAGE_HISTORY |
  Permissions.CONNECT |
  Permissions.SPEAK |
  Permissions.CHANGE_NICKNAME

/** Parse a decimal bitfield string, dropping unknown bits. Invalid input → 0. */
export function parseBits(value: string | bigint | null | undefined): bigint {
  if (typeof value === 'bigint') return value & ALL_PERMISSIONS
  if (!value || !/^\d{1,20}$/.test(value)) return 0n
  return BigInt(value) & ALL_PERMISSIONS
}

export function has(perms: bigint, flag: bigint) {
  return (perms & flag) === flag
}

export interface RoleLike {
  id: string
  permissions: bigint
}

export interface OverwriteLike {
  roleId: string | null
  userId: string | null
  allow: bigint
  deny: bigint
}

export interface PermissionSubject {
  userId: string
  isOwner: boolean
  everyone: RoleLike
  /** The member's assigned roles (excluding @everyone). */
  roles: RoleLike[]
}

/** Server-wide permissions: owner → all, @everyone | roles, ADMINISTRATOR → all. */
export function computeBasePermissions(subject: PermissionSubject): bigint {
  if (subject.isOwner) return ALL_PERMISSIONS
  let perms = subject.everyone.permissions
  for (const role of subject.roles) perms |= role.permissions
  if (has(perms, Permissions.ADMINISTRATOR)) return ALL_PERMISSIONS
  return perms
}

/**
 * Channel permissions following Discord's documented order:
 * base → @everyone overwrite → aggregated role overwrites (deny then allow)
 * → member overwrite. Losing VIEW_CHANNEL implicitly denies everything else.
 */
export function computeChannelPermissions(subject: PermissionSubject, overwrites: OverwriteLike[]): bigint {
  const base = computeBasePermissions(subject)
  if (has(base, Permissions.ADMINISTRATOR)) return ALL_PERMISSIONS

  let perms = base
  const everyoneOw = overwrites.find((o) => o.roleId === subject.everyone.id)
  if (everyoneOw) {
    perms &= ~everyoneOw.deny
    perms |= everyoneOw.allow
  }

  const roleIds = new Set(subject.roles.map((r) => r.id))
  let roleAllow = 0n
  let roleDeny = 0n
  for (const ow of overwrites) {
    if (ow.roleId && roleIds.has(ow.roleId)) {
      roleAllow |= ow.allow
      roleDeny |= ow.deny
    }
  }
  perms &= ~roleDeny
  perms |= roleAllow

  const memberOw = overwrites.find((o) => o.userId === subject.userId)
  if (memberOw) {
    perms &= ~memberOw.deny
    perms |= memberOw.allow
  }

  if (!has(perms, Permissions.VIEW_CHANNEL)) return 0n
  return perms
}

/**
 * Non-admins may only toggle permissions they hold themselves (Discord rule).
 * Returns true when every bit that differs between `before` and `after` is
 * one the actor has.
 */
export function canChangeBits(actorPerms: bigint, before: bigint, after: bigint) {
  if (has(actorPerms, Permissions.ADMINISTRATOR)) return true
  return ((before ^ after) & ~actorPerms) === 0n
}
