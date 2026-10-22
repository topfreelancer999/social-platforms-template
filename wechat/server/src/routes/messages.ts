import { Router } from 'express'
import { z } from 'zod'
import { MessageType, type Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import {
  canManage,
  createMessage,
  groupTitle,
  memberName,
  messageInclude,
  serializeMessage,
} from '../services/groupChats.js'

export const messagesRouter = Router()
messagesRouter.use(requireAuth)

type ThreadWithMembers = Prisma.ThreadGetPayload<{
  include: { participants: { include: { user: true } } }
}>

function threadPreview(
  thread: ThreadWithMembers & {
    messages: { content: string; createdAt: Date; senderId: string; read: boolean; type: MessageType }[]
  },
  userId: string,
) {
  const other = thread.participants.find((x) => x.userId !== userId)
  const last = thread.messages[0]
  return {
    title: thread.isGroup ? groupTitle(thread) : other ? (other.user.displayName || other.user.firstName) : 'Chat',
    avatarUrl: thread.isGroup ? thread.avatarUrl : other?.user.avatarUrl,
    // Group avatars are a grid of up to 9 member avatars, as in WeChat.
    memberAvatars: thread.isGroup
      ? [...thread.participants]
          .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())
          .slice(0, 9)
          .map((p) => p.user.avatarUrl)
      : [],
    memberCount: thread.participants.length,
    participant: other ? toPublicUser(other.user) : null,
    isGroup: thread.isGroup,
    lastMessage: last,
  }
}

const sendSchema = z.object({
  content: z.string().trim().min(1, 'Message cannot be empty').max(5000, 'Message is too long'),
  type: z.enum([MessageType.TEXT, MessageType.IMAGE, MessageType.DOCUMENT]).default(MessageType.TEXT),
  mediaUrl: z.string().url().max(2000).optional(),
  mentionIds: z.array(z.string().min(1)).max(100).default([]),
  mentionAll: z.boolean().default(false),
})
const dmSchema = z.object({
  toUserId: z.string().min(1),
  content: z.string().trim().min(1, 'Message cannot be empty').max(5000, 'Message is too long'),
})

messagesRouter.get('/threads', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const participants = await prisma.threadParticipant.findMany({
    where: { userId },
    include: {
      thread: {
        include: {
          participants: { include: { user: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      },
    },
    orderBy: { thread: { updatedAt: 'desc' } },
  })
  // Unread @mentions per group: "[You were mentioned]" beats "[@All]" until the chat is opened.
  const groupRows = participants.filter((p) => p.thread.isGroup)
  const mentions = groupRows.length
    ? await prisma.message.findMany({
        where: {
          senderId: { not: userId },
          type: { not: MessageType.SYSTEM },
          AND: [
            { OR: groupRows.map((p) => ({ threadId: p.threadId, createdAt: { gt: p.lastReadAt } })) },
            { OR: [{ mentionAll: true }, { mentions: { some: { userId } } }] },
          ],
        },
        select: { threadId: true, mentions: { where: { userId }, select: { userId: true } } },
      })
    : []
  const mentionState = new Map<string, 'ME' | 'ALL'>()
  for (const m of mentions) {
    if (m.mentions.length) mentionState.set(m.threadId, 'ME')
    else if (!mentionState.has(m.threadId)) mentionState.set(m.threadId, 'ALL')
  }
  res.json(
    participants.map((p) => ({
      id: p.thread.id,
      unread: p.unread,
      muted: p.muted,
      mention: mentionState.get(p.threadId) ?? null,
      updatedAt: p.thread.updatedAt,
      ...threadPreview(p.thread, userId),
    })),
  )
})

messagesRouter.get('/threads/:id', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const thread = await prisma.thread.findUnique({
    where: { id: param(req, 'id') },
    include: {
      participants: { include: { user: true } },
      messages: { orderBy: { createdAt: 'asc' }, include: messageInclude },
    },
  })
  if (!thread) return res.status(404).json({ message: 'Chat not found' })
  const member = thread.participants.find((p) => p.userId === userId)
  if (!member) return res.status(403).json({ message: 'You are not a member of this chat' })
  await prisma.threadParticipant.update({
    where: { threadId_userId: { threadId: thread.id, userId } },
    data: { unread: 0, lastReadAt: new Date() },
  })
  await prisma.message.updateMany({
    where: { threadId: thread.id, senderId: { not: userId } },
    data: { read: true },
  })
  const preview = threadPreview(
    { ...thread, messages: thread.messages.slice(-1) },
    userId,
  )
  res.json({
    thread: {
      id: thread.id,
      name: thread.name,
      updatedAt: thread.updatedAt,
      ...preview,
      myRole: member.role,
      announcement:
        thread.isGroup && thread.announcement
          ? { content: thread.announcement, updatedAt: thread.announcementAt }
          : null,
      participants: thread.participants.map((p) => ({
        ...toPublicUser(p.user),
        role: p.role,
        groupName: memberName(p),
      })),
    },
    messages: thread.messages.map(serializeMessage),
  })
})

messagesRouter.post('/threads', async (req: AuthRequest, res) => {
  const body = dmSchema.safeParse(req.body ?? {})
  if (!body.success) return res.status(400).json({ message: body.error.issues[0]?.message ?? 'Invalid input' })
  const userId = req.userId!
  const { toUserId, content } = body.data
  if (toUserId === userId) return res.status(400).json({ message: 'You cannot message yourself' })
  if (!(await prisma.user.findUnique({ where: { id: toUserId } }))) {
    return res.status(404).json({ message: 'User not found' })
  }
  const existing = await prisma.thread.findMany({
    where: {
      isGroup: false,
      participants: { some: { userId } },
      AND: { participants: { some: { userId: toUserId } } },
    },
    include: { participants: true },
  })
  let thread = existing.find((t) => t.participants.length === 2)
  if (!thread) {
    thread = await prisma.thread.create({
      data: {
        participants: {
          create: [{ userId }, { userId: toUserId }],
        },
      },
      include: { participants: true },
    })
  }
  const msg = await createMessage({ threadId: thread.id, senderId: userId, content })
  await prisma.user.update({ where: { id: userId }, data: { lastSeen: new Date() } })
  res.status(201).json({ threadId: thread.id, message: msg })
})

messagesRouter.post('/threads/:id', async (req: AuthRequest, res) => {
  const body = sendSchema.safeParse(req.body ?? {})
  if (!body.success) return res.status(400).json({ message: body.error.issues[0]?.message ?? 'Invalid input' })
  const userId = req.userId!
  const threadId = param(req, 'id')
  const thread = await prisma.thread.findUnique({ where: { id: threadId }, select: { isGroup: true } })
  if (!thread) return res.status(404).json({ message: 'Chat not found' })
  const member = await prisma.threadParticipant.findUnique({ where: { threadId_userId: { threadId, userId } } })
  if (!member) return res.status(403).json({ message: 'You are not a member of this chat' })
  if (body.data.mentionAll && !(thread.isGroup && canManage(member.role))) {
    return res.status(403).json({ message: 'Only the group owner or admins can @All' })
  }
  const msg = await createMessage({
    threadId,
    senderId: userId,
    content: body.data.content,
    type: body.data.type,
    mediaUrl: body.data.mediaUrl,
    mentionIds: thread.isGroup ? body.data.mentionIds : [],
    mentionAll: body.data.mentionAll,
  })
  await prisma.user.update({ where: { id: userId }, data: { lastSeen: new Date() } })
  res.status(201).json(msg)
})
