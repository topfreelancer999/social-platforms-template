import { ChatRole, MessageType, NotificationType, type Prisma, type User } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import { emitToUsers } from '../socket/emitter.js'

/** WeChat group QR codes are valid for 7 days. */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export const messageInclude = {
  sender: true,
  mentions: { select: { userId: true } },
} satisfies Prisma.MessageInclude

export type MessageWithRelations = Prisma.MessageGetPayload<{ include: typeof messageInclude }>

export const userName = (u: Pick<User, 'displayName' | 'firstName'>) => u.displayName || u.firstName

/** Name shown inside a group: the member's "alias in group", else their display name. */
export const memberName = (p: { alias: string; user: Pick<User, 'displayName' | 'firstName'> }) =>
  p.alias || userName(p.user)

/** Unnamed groups show their members' names joined, as WeChat does. */
export function groupTitle(thread: {
  name: string | null
  participants: { joinedAt: Date; user: Pick<User, 'displayName' | 'firstName'> }[]
}) {
  if (thread.name) return thread.name
  const names = [...thread.participants]
    .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())
    .map((p) => userName(p.user))
  return names.slice(0, 4).join(', ') + (names.length > 4 ? '…' : '')
}

export const canManage = (role: ChatRole) => role === ChatRole.OWNER || role === ChatRole.ADMIN

export function serializeMessage(m: MessageWithRelations) {
  return {
    id: m.id,
    content: m.content,
    type: m.type,
    mediaUrl: m.mediaUrl,
    read: m.read,
    delivered: m.delivered,
    createdAt: m.createdAt,
    senderId: m.senderId,
    sender: toPublicUser(m.sender),
    mentionAll: m.mentionAll,
    mentionIds: m.mentions.map((x) => x.userId),
  }
}

/** The caller's participant row for a group chat, or why access is refused. */
export async function getGroupMembership(threadId: string, userId: string) {
  const thread = await prisma.thread.findUnique({ where: { id: threadId }, select: { id: true, isGroup: true } })
  if (!thread || !thread.isGroup) return { member: null, status: 404, message: 'Group chat not found' }
  const member = await prisma.threadParticipant.findUnique({ where: { threadId_userId: { threadId, userId } } })
  if (!member) return { member: null, status: 403, message: 'You are not a member of this group chat' }
  return { member, status: 200, message: '' }
}

interface CreateMessageInput {
  threadId: string
  senderId: string
  content: string
  type?: MessageType
  mediaUrl?: string | null
  mentionIds?: string[]
  mentionAll?: boolean
}

/**
 * Store a message, bump unread counts, record @mentions, notify mentioned members
 * and push `message:new` to everyone else in the thread.
 */
export async function createMessage(input: CreateMessageInput) {
  const { threadId, senderId } = input
  const type = input.type ?? MessageType.TEXT
  const thread = await prisma.thread.findUniqueOrThrow({
    where: { id: threadId },
    include: { participants: { include: { user: true } } },
  })
  const memberIds = new Set(thread.participants.map((p) => p.userId))
  const mentionIds = [...new Set(input.mentionIds ?? [])].filter((id) => id !== senderId && memberIds.has(id))
  const mentionAll = !!input.mentionAll || type === MessageType.NOTICE

  const msg = await prisma.message.create({
    data: {
      threadId,
      senderId,
      content: input.content,
      type,
      mediaUrl: input.mediaUrl ?? null,
      mentionAll,
      mentions: { create: mentionIds.map((userId) => ({ userId })) },
    },
    include: messageInclude,
  })
  const others = thread.participants.filter((p) => p.userId !== senderId)
  await prisma.$transaction([
    prisma.thread.update({ where: { id: threadId }, data: { updatedAt: new Date() } }),
    prisma.threadParticipant.updateMany({
      where: { threadId, userId: { not: senderId } },
      data: { unread: { increment: 1 } },
    }),
  ])

  if (thread.isGroup && type !== MessageType.SYSTEM) {
    const notified = mentionAll ? others.map((p) => p.userId) : mentionIds
    if (notified.length) {
      const sender = thread.participants.find((p) => p.userId === senderId)
      const from = sender ? memberName(sender) : userName(msg.sender)
      const title = groupTitle(thread)
      await prisma.notification.createMany({
        data: notified.map((userId) => ({
          userId,
          actorId: senderId,
          type: type === MessageType.NOTICE ? NotificationType.GROUP_NOTICE : NotificationType.GROUP_MENTION,
          title: type === MessageType.NOTICE ? `Group Notice in ${title}` : `${from} mentioned you in ${title}`,
          body: input.content.slice(0, 200),
          link: `/chat/${threadId}`,
        })),
      })
    }
  }

  const payload = serializeMessage(msg)
  emitToUsers(
    others.map((p) => p.userId),
    'message:new',
    { threadId, message: payload },
  )
  return payload
}

/** Grey centred line in the chat ("X joined the group chat via QR code"). */
export function postSystemMessage(threadId: string, actorId: string, content: string) {
  return createMessage({ threadId, senderId: actorId, content, type: MessageType.SYSTEM })
}

/** Tell every current member (plus `extra`, e.g. someone just removed) that the group changed. */
export async function emitGroupUpdated(threadId: string, extra: string[] = []) {
  const members = await prisma.threadParticipant.findMany({ where: { threadId }, select: { userId: true } })
  emitToUsers([...members.map((m) => m.userId), ...extra], 'group:updated', { threadId })
}
