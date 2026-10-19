/** Client mirror of server/src/lib/permissions.ts — Discord bit values, bitfields as decimal strings on the wire. */
export const P = {
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

export type PermissionKey = keyof typeof P

export function bits(value: string | undefined | null): bigint {
  if (!value || !/^\d+$/.test(value)) return 0n
  return BigInt(value)
}

export function has(perms: bigint | string | undefined, flag: bigint) {
  const p = typeof perms === 'bigint' ? perms : bits(perms)
  return (p & flag) === flag
}

export interface PermissionDef {
  key: PermissionKey
  label: string
  /** Label used on channel overwrites when it differs (e.g. Manage Roles → Manage Permissions). */
  channelLabel?: string
  description: string
  /** Shown on channel overwrites for these channel kinds; omitted = server-only. */
  channel?: ('text' | 'voice')[]
}

export interface PermissionGroup {
  title: string
  items: PermissionDef[]
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    title: 'General Server Permissions',
    items: [
      { key: 'VIEW_CHANNEL', label: 'View Channels', description: 'Allows members to view channels by default (excluding private channels).', channel: ['text', 'voice'] },
      { key: 'MANAGE_CHANNELS', label: 'Manage Channels', channelLabel: 'Manage Channel', description: 'Allows members to create, edit, or delete channels.', channel: ['text', 'voice'] },
      { key: 'MANAGE_ROLES', label: 'Manage Roles', channelLabel: 'Manage Permissions', description: 'Allows members to create new roles and edit or delete roles lower than their highest role.', channel: ['text', 'voice'] },
      { key: 'VIEW_AUDIT_LOG', label: 'View Audit Log', description: 'Allows members to view a record of who made which changes in this server.' },
      { key: 'MANAGE_GUILD', label: 'Manage Server', description: "Allows members to change this server's name and other settings." },
    ],
  },
  {
    title: 'Membership Permissions',
    items: [
      { key: 'CREATE_INSTANT_INVITE', label: 'Create Invite', description: 'Allows members to invite new people to this server.', channel: ['text', 'voice'] },
      { key: 'CHANGE_NICKNAME', label: 'Change Nickname', description: 'Allows members to change their own nickname.' },
      { key: 'MANAGE_NICKNAMES', label: 'Manage Nicknames', description: 'Allows members to change the nicknames of other members.' },
      { key: 'KICK_MEMBERS', label: 'Kick Members', description: 'Allows members to remove other members from this server.' },
      { key: 'BAN_MEMBERS', label: 'Ban Members', description: 'Allows members to permanently ban other members from this server.' },
    ],
  },
  {
    title: 'Text Channel Permissions',
    items: [
      { key: 'SEND_MESSAGES', label: 'Send Messages', description: 'Allows members to send messages in text channels.', channel: ['text'] },
      { key: 'EMBED_LINKS', label: 'Embed Links', description: 'Allows links that members share to show embedded content.', channel: ['text'] },
      { key: 'ATTACH_FILES', label: 'Attach Files', description: 'Allows members to upload files or media.', channel: ['text'] },
      { key: 'ADD_REACTIONS', label: 'Add Reactions', description: 'Allows members to add new emoji reactions to a message.', channel: ['text'] },
      { key: 'MENTION_EVERYONE', label: 'Mention @everyone, @here, and All Roles', description: 'Allows members to notify everyone in the channel or any role.', channel: ['text'] },
      { key: 'MANAGE_MESSAGES', label: 'Manage Messages', description: 'Allows members to delete messages by other members.', channel: ['text'] },
      { key: 'READ_MESSAGE_HISTORY', label: 'Read Message History', description: 'Allows members to read previous messages sent in channels.', channel: ['text'] },
    ],
  },
  {
    title: 'Voice Channel Permissions',
    items: [
      { key: 'CONNECT', label: 'Connect', description: 'Allows members to join voice channels and hear others.', channel: ['voice'] },
      { key: 'SPEAK', label: 'Speak', description: 'Allows members to talk in voice channels.', channel: ['voice'] },
      { key: 'MUTE_MEMBERS', label: 'Mute Members', description: 'Allows members to mute other members in voice channels for everyone.', channel: ['voice'] },
    ],
  },
  {
    title: 'Advanced Permissions',
    items: [
      { key: 'ADMINISTRATOR', label: 'Administrator', description: 'Members with this permission have every permission and bypass all channel-specific permissions. This is a dangerous permission to grant.' },
    ],
  },
]

/** Groups filtered to what can be overwritten on a channel of the given kind. */
export function channelPermissionGroups(kind: 'text' | 'voice'): PermissionGroup[] {
  return PERMISSION_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => i.channel?.includes(kind)) })).filter(
    (g) => g.items.length > 0,
  )
}

/** Discord's role colour swatches (top row, then darker variants). */
export const ROLE_COLOR_PRESETS = [
  0x1abc9c, 0x2ecc71, 0x3498db, 0x9b59b6, 0xe91e63, 0xf1c40f, 0xe67e22, 0xe74c3c, 0x95a5a6, 0x607d8b,
  0x11806a, 0x1f8b4c, 0x206694, 0x71368a, 0xad1457, 0xc27c0e, 0xa84300, 0x992d22, 0x979c9f, 0x546e7a,
]

/** Colour 0 means "default" — Discord renders it as this neutral grey. */
export const DEFAULT_ROLE_COLOR = 0x99aab5

export function colorHex(color: number, fallback = DEFAULT_ROLE_COLOR) {
  return `#${(color || fallback).toString(16).padStart(6, '0')}`
}

export function hexToColor(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16)
  return Number.isFinite(n) ? n : 0
}
