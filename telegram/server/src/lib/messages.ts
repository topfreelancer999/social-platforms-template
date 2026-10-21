import type { Prisma, User } from '@prisma/client'
import { prisma } from './prisma.js'
import { HttpError } from './http.js'
import { emitToUsers } from './realtime.js'

/** Telegram lets you edit your own text messages for 48 hours after sending. */
export const EDIT_WINDOW_MS = 48 * 60 * 60 * 1000
export const MAX_MESSAGE_LENGTH = 4096

export const messageInclude = {
  sender: true,
  replyTo: { include: { sender: true } },
} satisfies Prisma.MessageInclude

type FullMessage = Prisma.MessageGetPayload<{ include: typeof messageInclude }>

export function displayName(u: Pick<User, 'displayName' | 'firstName' | 'lastName'>) {
  return u.displayName || `${u.firstName} ${u.lastName}`.trim()
}

function publicSender(u: User) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    firstName: u.firstName,
    lastName: u.lastName,
    avatarUrl: u.avatarUrl,
  }
}

/**
 * API shape of a message. `hiddenIds` are messages the viewer deleted for themselves:
 * a reply quoting one of those shows "Deleted message", same as a reply to a removed message.
 */
export function serializeMessage(m: FullMessage, hiddenIds?: Set<string>) {
  const quoteGone = m.replyToDeleted || (!!m.replyTo && !!hiddenIds?.has(m.replyTo.id))
  return {
    id: m.id,
    threadId: m.threadId,
    senderId: m.senderId,
    sender: publicSender(m.sender),
    content: m.content,
    type: m.type,
    mediaUrl: m.mediaUrl,
    read: m.read,
    createdAt: m.createdAt,
    editedAt: m.editedAt,
    replyTo:
      m.replyTo && !quoteGone
        ? {
            id: m.replyTo.id,
            senderId: m.replyTo.senderId,
            senderName: displayName(m.replyTo.sender),
            content: m.replyTo.content,
            type: m.replyTo.type,
          }
        : null,
    replyToDeleted: quoteGone,
    forwardedFrom: m.forwardedFromName
      ? { userId: m.forwardedFromId, name: m.forwardedFromName, date: m.forwardedDate }
      : null,
  }
}

export type MessageDto = ReturnType<typeof serializeMessage>

/** Loads a thread's participant ids; 404 if it doesn't exist, 403 if `userId` isn't in it. */
export async function loadThreadMembers(threadId: string, userId: string, forbidden = 'You are not a member of this chat') {
  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    select: { id: true, isGroup: true, participants: { select: { userId: true } } },
  })
  if (!thread) throw new HttpError(404, 'Chat not found')
  const memberIds = thread.participants.map((p) => p.userId)
  if (!memberIds.includes(userId)) throw new HttpError(403, forbidden)
  return { id: thread.id, isGroup: thread.isGroup, memberIds }
}

/** Thread ids (among `threadIds`) whose linked group lists `userId` as an admin. */
export async function adminThreadIds(threadIds: string[], userId: string) {
  const groups = await prisma.group.findMany({
    where: { threadId: { in: threadIds }, members: { some: { userId, isAdmin: true } } },
    select: { threadId: true },
  })
  return new Set(groups.map((g) => g.threadId!))
}

export async function createMessage(input: {
  threadId: string
  senderId: string
  content: string
  replyToId?: string | null
}) {
  const { threadId, senderId, content, replyToId } = input
  const thread = await loadThreadMembers(threadId, senderId)
  if (replyToId) {
    const target = await prisma.message.findUnique({ where: { id: replyToId }, select: { threadId: true } })
    if (!target) throw new HttpError(400, 'The message you are replying to was deleted')
    if (target.threadId !== threadId) throw new HttpError(400, 'You can only reply to a message in the same chat')
  }
  const msg = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: { threadId, senderId, content, replyToId: replyToId || null },
      include: messageInclude,
    })
    await tx.thread.update({ where: { id: threadId }, data: { updatedAt: new Date() } })
    await tx.threadParticipant.updateMany({
      where: { threadId, userId: { not: senderId } },
      data: { unread: { increment: 1 } },
    })
    return created
  })
  const dto = serializeMessage(msg)
  emitToUsers(thread.memberIds, 'message:new', { threadId, message: dto })
  return dto
}

export async function editMessage(messageId: string, userId: string, content: string) {
  const msg = await prisma.message.findUnique({ where: { id: messageId }, include: messageInclude })
  if (!msg) throw new HttpError(404, 'Message not found')
  const thread = await loadThreadMembers(msg.threadId, userId)
  if (msg.senderId !== userId) throw new HttpError(403, 'You can only edit your own messages')
  if (msg.type !== 'TEXT') throw new HttpError(400, 'Only text messages can be edited')
  if (msg.forwardedFromName) throw new HttpError(400, 'Forwarded messages cannot be edited')
  if (Date.now() - msg.createdAt.getTime() > EDIT_WINDOW_MS) {
    throw new HttpError(403, 'Messages can only be edited within 48 hours of sending')
  }
  if (msg.content === content) return serializeMessage(msg)

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { content, editedAt: new Date() },
    include: messageInclude,
  })
  const dto = serializeMessage(updated)
  emitToUsers(thread.memberIds, 'message:edited', { threadId: msg.threadId, message: dto })
  return dto
}

/**
 * Delete for me hides the messages for `userId` only. Delete for everyone removes them for
 * all participants: allowed for your own messages, or any message in a group you admin.
 */
export async function deleteMessages(messageIds: string[], userId: string, forEveryone: boolean) {
  const ids = [...new Set(messageIds)]
  const messages = await prisma.message.findMany({
    where: { id: { in: ids } },
    select: { id: true, threadId: true, senderId: true, read: true },
  })
  if (messages.length !== ids.length) throw new HttpError(404, 'Message not found')

  const threadIds = [...new Set(messages.map((m) => m.threadId))]
  const participants = await prisma.threadParticipant.findMany({ where: { threadId: { in: threadIds } } })
  for (const threadId of threadIds) {
    if (!participants.some((p) => p.threadId === threadId && p.userId === userId)) {
      throw new HttpError(403, 'You are not a member of this chat')
    }
  }
  const idsByThread = (threadId: string) => messages.filter((m) => m.threadId === threadId).map((m) => m.id)

  if (!forEveryone) {
    await prisma.$transaction(
      ids.map((messageId) =>
        prisma.messageHidden.upsert({
          where: { messageId_userId: { messageId, userId } },
          create: { messageId, userId },
          update: {},
        }),
      ),
    )
    for (const threadId of threadIds) {
      emitToUsers([userId], 'message:deleted', { threadId, messageIds: idsByThread(threadId), forEveryone: false })
    }
    return { deleted: ids.length, forEveryone }
  }

  const moderated = await adminThreadIds(threadIds, userId)
  if (messages.some((m) => m.senderId !== userId && !moderated.has(m.threadId))) {
    throw new HttpError(403, 'You can only delete your own messages for everyone')
  }

  await prisma.$transaction([
    prisma.message.updateMany({ where: { replyToId: { in: ids } }, data: { replyToDeleted: true } }),
    prisma.message.deleteMany({ where: { id: { in: ids } } }),
    // Unread counters were bumped when these arrived; take back the ones nobody had read yet.
    ...participants.flatMap((p) => {
      const unreadGone = messages.filter((m) => m.threadId === p.threadId && !m.read && m.senderId !== p.userId).length
      if (!unreadGone || !p.unread) return []
      return [prisma.threadParticipant.update({ where: { id: p.id }, data: { unread: Math.max(0, p.unread - unreadGone) } })]
    }),
  ])
  for (const threadId of threadIds) {
    const memberIds = participants.filter((p) => p.threadId === threadId).map((p) => p.userId)
    emitToUsers(memberIds, 'message:deleted', { threadId, messageIds: idsByThread(threadId), forEveryone: true })
  }
  return { deleted: ids.length, forEveryone }
}

/**
 * Copies messages into other chats. Copies keep the original author/date as a
 * "Forwarded from" header (re-forwarding keeps the first author) unless `hideSender` is set.
 */
export async function forwardMessages(input: {
  messageIds: string[]
  toThreadIds: string[]
  userId: string
  hideSender: boolean
}) {
  const { userId, hideSender } = input
  const ids = [...new Set(input.messageIds)]
  const sources = await prisma.message.findMany({
    where: { id: { in: ids }, hiddenFor: { none: { userId } } },
    include: { sender: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
  if (sources.length !== ids.length) throw new HttpError(404, 'Message not found')
  for (const threadId of new Set(sources.map((m) => m.threadId))) {
    await loadThreadMembers(threadId, userId, 'You can only forward messages from chats you are in')
  }
  const targets = []
  for (const threadId of new Set(input.toThreadIds)) {
    targets.push(await loadThreadMembers(threadId, userId, 'You can only forward to chats you are in'))
  }

  const results: { threadId: string; messages: MessageDto[] }[] = []
  for (const target of targets) {
    const base = Date.now()
    const created = await prisma.$transaction(async (tx) => {
      const copies = []
      for (const [i, src] of sources.entries()) {
        copies.push(
          await tx.message.create({
            data: {
              threadId: target.id,
              senderId: userId,
              content: src.content,
              type: src.type,
              mediaUrl: src.mediaUrl,
              // Distinct timestamps keep the forwarded batch in its original order.
              createdAt: new Date(base + i),
              ...(hideSender
                ? {}
                : {
                    forwardedFromId: src.forwardedFromName ? src.forwardedFromId : src.senderId,
                    forwardedFromName: src.forwardedFromName ?? displayName(src.sender),
                    forwardedDate: src.forwardedDate ?? src.createdAt,
                  }),
            },
            include: messageInclude,
          }),
        )
      }
      await tx.thread.update({ where: { id: target.id }, data: { updatedAt: new Date() } })
      await tx.threadParticipant.updateMany({
        where: { threadId: target.id, userId: { not: userId } },
        data: { unread: { increment: copies.length } },
      })
      return copies
    })
    const dtos = created.map((m) => serializeMessage(m))
    emitToUsers(target.memberIds, 'message:forwarded', { threadId: target.id, messages: dtos })
    results.push({ threadId: target.id, messages: dtos })
  }
  return { forwarded: results }
}
