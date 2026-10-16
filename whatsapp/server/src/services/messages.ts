import type { Message, MessageReceipt, MessageType, User } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import { emitToUser } from '../lib/io.js'
import { isOnline } from '../lib/presence.js'

export type MessageStatus = 'sent' | 'delivered' | 'read'

type Receipt = Pick<MessageReceipt, 'userId' | 'deliveredAt' | 'readAt'>

/** userId → whether that user sends/sees read receipts (Privacy → Read receipts). */
export type ReceiptSettings = Map<string, boolean>

export async function loadReceiptSettings(userIds: string[]): Promise<ReceiptSettings> {
  const rows = await prisma.userSettings.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, readReceipts: true },
  })
  return new Map(userIds.map((id) => [id, rows.find((r) => r.userId === id)?.readReceipts ?? true]))
}

/**
 * WhatsApp hides blue ticks in 1:1 chats when either side turned read receipts
 * off. Group chats always report reads.
 */
export function canSeeRead(isGroup: boolean, senderId: string, readerId: string, settings: ReceiptSettings) {
  return isGroup || ((settings.get(senderId) ?? true) && (settings.get(readerId) ?? true))
}

/** Aggregate status: single tick until every recipient has it, blue once every recipient read it. */
export function messageStatus(
  message: { senderId: string; receipts: Receipt[] },
  isGroup: boolean,
  settings: ReceiptSettings,
): MessageStatus {
  const { receipts } = message
  if (!receipts.length || receipts.some((r) => !r.deliveredAt)) return 'sent'
  if (receipts.every((r) => r.readAt && canSeeRead(isGroup, message.senderId, r.userId, settings))) return 'read'
  return 'delivered'
}

export function serializeMessage(
  m: Message & { sender: User; receipts: Receipt[] },
  viewerId: string,
  isGroup: boolean,
  settings: ReceiptSettings,
) {
  return {
    id: m.id,
    threadId: m.threadId,
    content: m.content,
    type: m.type,
    mediaUrl: m.mediaUrl,
    createdAt: m.createdAt,
    senderId: m.senderId,
    sender: toPublicUser(m.sender),
    // Ticks are only shown on your own messages.
    status: m.senderId === viewerId ? messageStatus(m, isGroup, settings) : null,
  }
}

/** Tell each sender whose messages changed state to refresh its ticks. */
function notifySenders(rows: { message: { senderId: string; threadId: string } }[]) {
  const seen = new Set<string>()
  for (const { message } of rows) {
    const key = `${message.senderId}:${message.threadId}`
    if (seen.has(key)) continue
    seen.add(key)
    emitToUser(message.senderId, 'receipt:update', { threadId: message.threadId })
  }
}

export async function createMessage(
  threadId: string,
  senderId: string,
  input: { content: string; type?: MessageType; mediaUrl?: string | null },
) {
  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    include: { participants: true },
  })
  if (!thread || !thread.participants.some((p) => p.userId === senderId)) return null

  const now = new Date()
  const recipients = thread.participants.filter((p) => p.userId !== senderId)
  const msg = await prisma.message.create({
    data: {
      threadId,
      senderId,
      content: input.content,
      type: input.type ?? 'TEXT',
      mediaUrl: input.mediaUrl ?? null,
      // Recipients with an open socket receive the message instantly → double grey tick.
      receipts: {
        create: recipients.map((r) => ({ userId: r.userId, deliveredAt: isOnline(r.userId) ? now : null })),
      },
    },
    include: { sender: true, receipts: true },
  })
  await prisma.$transaction([
    prisma.thread.update({ where: { id: threadId }, data: { updatedAt: now } }),
    prisma.threadParticipant.updateMany({
      where: { threadId, userId: { not: senderId } },
      data: { unread: { increment: 1 } },
    }),
    prisma.user.update({ where: { id: senderId }, data: { lastSeen: now } }),
  ])

  const settings = await loadReceiptSettings(thread.participants.map((p) => p.userId))
  for (const r of recipients) {
    emitToUser(r.userId, 'message:new', {
      threadId,
      message: serializeMessage(msg, r.userId, thread.isGroup, settings),
    })
  }
  return serializeMessage(msg, senderId, thread.isGroup, settings)
}

/** The user's device synced: everything waiting for them is now delivered. */
export async function markDelivered(userId: string) {
  const pending = await prisma.messageReceipt.findMany({
    where: { userId, deliveredAt: null },
    select: { id: true, message: { select: { senderId: true, threadId: true } } },
  })
  if (!pending.length) return
  await prisma.messageReceipt.updateMany({
    where: { id: { in: pending.map((r) => r.id) } },
    data: { deliveredAt: new Date() },
  })
  notifySenders(pending)
}

/** The user opened the chat: clear the unread badge and turn the sender's ticks blue. */
export async function markThreadRead(threadId: string, userId: string) {
  const unread = await prisma.messageReceipt.findMany({
    where: { userId, readAt: null, message: { threadId } },
    select: { id: true, deliveredAt: true, message: { select: { senderId: true, threadId: true } } },
  })
  const now = new Date()
  const ids = unread.map((r) => r.id)
  await prisma.$transaction([
    prisma.messageReceipt.updateMany({
      where: { id: { in: ids }, deliveredAt: null },
      data: { deliveredAt: now },
    }),
    prisma.messageReceipt.updateMany({ where: { id: { in: ids } }, data: { readAt: now } }),
    prisma.threadParticipant.update({
      where: { threadId_userId: { threadId, userId } },
      data: { unread: 0 },
    }),
  ])
  notifySenders(unread)
  return ids.length
}

/** Everyone who shares a chat with the user (receives their presence/typing updates). */
export async function chatPeers(userId: string) {
  const rows = await prisma.threadParticipant.findMany({
    where: { thread: { participants: { some: { userId } } }, userId: { not: userId } },
    select: { userId: true },
    distinct: ['userId'],
  })
  return rows.map((r) => r.userId)
}
