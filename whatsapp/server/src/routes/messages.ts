import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'

export const messagesRouter = Router()
messagesRouter.use(requireAuth)

function threadPreview(thread: {
  isGroup: boolean
  name: string | null
  avatarUrl: string | null
  participants: { userId: string; user: Parameters<typeof toPublicUser>[0] }[]
  messages: { content: string; createdAt: Date; senderId: string; read: boolean }[]
}, userId: string) {
  const other = thread.participants.find((x) => x.userId !== userId)
  const last = thread.messages[0]
  return {
    title: thread.isGroup ? thread.name : other ? (other.user.displayName || other.user.firstName) : 'Chat',
    avatarUrl: thread.isGroup ? thread.avatarUrl : other?.user.avatarUrl,
    participant: other ? toPublicUser(other.user) : null,
    isGroup: thread.isGroup,
    lastMessage: last,
  }
}

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
  res.json(
    participants.map((p) => ({
      id: p.thread.id,
      unread: p.unread,
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
      messages: { orderBy: { createdAt: 'asc' }, include: { sender: true } },
    },
  })
  if (!thread) return res.status(404).json({ message: 'Not found' })
  const member = thread.participants.find((p) => p.userId === userId)
  if (!member) return res.status(403).json({ message: 'Forbidden' })
  await prisma.threadParticipant.update({
    where: { threadId_userId: { threadId: thread.id, userId } },
    data: { unread: 0 },
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
      participants: thread.participants.map((p) => ({
        ...toPublicUser(p.user),
        isAdmin: p.isAdmin,
      })),
    },
    messages: thread.messages.map((m) => ({
      id: m.id,
      content: m.content,
      type: m.type,
      mediaUrl: m.mediaUrl,
      read: m.read,
      delivered: m.delivered,
      createdAt: m.createdAt,
      senderId: m.senderId,
      sender: toPublicUser(m.sender),
    })),
  })
})

messagesRouter.post('/threads', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const { toUserId, content } = req.body as { toUserId: string; content: string }
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
  const msg = await prisma.message.create({
    data: { threadId: thread.id, senderId: userId, content },
  })
  await prisma.thread.update({ where: { id: thread.id }, data: { updatedAt: new Date() } })
  await prisma.threadParticipant.updateMany({
    where: { threadId: thread.id, userId: toUserId },
    data: { unread: { increment: 1 } },
  })
  await prisma.user.update({ where: { id: userId }, data: { lastSeen: new Date() } })
  res.status(201).json({ threadId: thread.id, message: msg })
})

messagesRouter.post('/groups', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const { name, memberIds, content } = req.body as { name: string; memberIds: string[]; content?: string }
  const ids = [...new Set([userId, ...memberIds])]
  const thread = await prisma.thread.create({
    data: {
      isGroup: true,
      name: name.trim(),
      avatarUrl: `https://picsum.photos/seed/g${Date.now()}/96/96`,
      participants: {
        create: ids.map((id) => ({ userId: id, isAdmin: id === userId })),
      },
    },
  })
  if (content?.trim()) {
    await prisma.message.create({
      data: { threadId: thread.id, senderId: userId, content: content.trim() },
    })
  }
  res.status(201).json({ threadId: thread.id })
})

messagesRouter.post('/threads/:id', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const threadId = param(req, 'id')
  const { content, type, mediaUrl } = req.body as { content: string; type?: string; mediaUrl?: string }
  const msg = await prisma.message.create({
    data: {
      threadId,
      senderId: userId,
      content,
      type: (type as 'TEXT' | 'IMAGE' | 'DOCUMENT') ?? 'TEXT',
      mediaUrl: mediaUrl ?? null,
    },
    include: { sender: true },
  })
  await prisma.thread.update({ where: { id: threadId }, data: { updatedAt: new Date() } })
  await prisma.user.update({ where: { id: userId }, data: { lastSeen: new Date() } })
  const others = await prisma.threadParticipant.findMany({
    where: { threadId, userId: { not: userId } },
  })
  for (const o of others) {
    await prisma.threadParticipant.update({
      where: { id: o.id },
      data: { unread: { increment: 1 } },
    })
  }
  res.status(201).json({
    id: msg.id,
    content: msg.content,
    type: msg.type,
    mediaUrl: msg.mediaUrl,
    read: msg.read,
    delivered: msg.delivered,
    createdAt: msg.createdAt,
    senderId: msg.senderId,
    sender: toPublicUser(msg.sender),
  })
})
