import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { presenceView } from '../lib/presence.js'
import {
  canSeeRead,
  createMessage,
  loadReceiptSettings,
  markDelivered,
  markThreadRead,
  serializeMessage,
} from '../services/messages.js'

export const messagesRouter = Router()
messagesRouter.use(requireAuth)

const sendSchema = z
  .object({
    content: z.string().trim().max(4096).default(''),
    type: z.enum(['TEXT', 'IMAGE', 'DOCUMENT']).default('TEXT'),
    mediaUrl: z.string().url().max(2048).optional(),
  })
  .refine((b) => b.content.length > 0 || !!b.mediaUrl, { message: 'Message is empty' })

const newChatSchema = z.object({
  toUserId: z.string().min(1),
  content: z.string().trim().min(1).max(4096),
})

const newGroupSchema = z.object({
  name: z.string().trim().min(1).max(100),
  memberIds: z.array(z.string().min(1)).max(255).default([]),
  content: z.string().trim().max(4096).optional(),
})

function badRequest(res: import('express').Response, error: z.ZodError) {
  return res.status(400).json({ message: error.issues[0]?.message ?? 'Invalid request' })
}

type UserWithSettings = Parameters<typeof toPublicUser>[0] & {
  settings: { lastSeenVisible: boolean; readReceipts: boolean } | null
}

function publicUser(u: UserWithSettings) {
  const { settings: _settings, lastSeen: _lastSeen, ...rest } = u
  return toPublicUser(rest as Parameters<typeof toPublicUser>[0])
}

const withSettings = { include: { user: { include: { settings: true } } } } as const

messagesRouter.get('/threads', async (req: AuthRequest, res) => {
  const userId = req.userId!
  // Fetching the chat list means this device has synced → pending messages are delivered.
  await markDelivered(userId)
  const participants = await prisma.threadParticipant.findMany({
    where: { userId },
    include: {
      thread: {
        include: {
          participants: withSettings,
          messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { sender: true, receipts: true } },
        },
      },
    },
    orderBy: { thread: { updatedAt: 'desc' } },
  })
  res.json(
    participants.map(({ thread, unread }) => {
      const other = thread.participants.find((x) => x.userId !== userId)
      const settings = new Map(thread.participants.map((p) => [p.userId, p.user.settings?.readReceipts ?? true]))
      const last = thread.messages[0]
      return {
        id: thread.id,
        unread,
        updatedAt: thread.updatedAt,
        isGroup: thread.isGroup,
        title: thread.isGroup ? thread.name : other ? other.user.displayName || other.user.firstName : 'Chat',
        avatarUrl: thread.isGroup ? thread.avatarUrl : other?.user.avatarUrl,
        participant: other ? publicUser(other.user) : null,
        lastMessage: last ? serializeMessage(last, userId, thread.isGroup, settings) : null,
      }
    }),
  )
})

messagesRouter.get('/threads/:id', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const thread = await prisma.thread.findUnique({
    where: { id: param(req, 'id') },
    include: {
      participants: withSettings,
      messages: { orderBy: { createdAt: 'asc' }, include: { sender: true, receipts: true } },
    },
  })
  if (!thread) return res.status(404).json({ message: 'Not found' })
  const me = thread.participants.find((p) => p.userId === userId)
  if (!me) return res.status(403).json({ message: 'Forbidden' })

  const other = thread.participants.find((p) => p.userId !== userId)
  const settings = new Map(thread.participants.map((p) => [p.userId, p.user.settings?.readReceipts ?? true]))
  const viewerShares = me.user.settings?.lastSeenVisible ?? true
  res.json({
    thread: {
      id: thread.id,
      name: thread.name,
      isGroup: thread.isGroup,
      updatedAt: thread.updatedAt,
      title: thread.isGroup ? thread.name : other ? other.user.displayName || other.user.firstName : 'Chat',
      avatarUrl: thread.isGroup ? thread.avatarUrl : other?.user.avatarUrl,
      unread: me.unread,
      participants: thread.participants.map((p) => ({
        ...publicUser(p.user),
        isAdmin: p.isAdmin,
        ...(p.userId === userId ? { online: true, lastSeen: null } : presenceView(p.user, viewerShares)),
      })),
    },
    messages: thread.messages.map((m) => serializeMessage(m, userId, thread.isGroup, settings)),
  })
})

messagesRouter.post('/threads/:id/read', async (req: AuthRequest, res) => {
  const threadId = param(req, 'id')
  const member = await prisma.threadParticipant.findUnique({
    where: { threadId_userId: { threadId, userId: req.userId! } },
  })
  if (!member) return res.status(404).json({ message: 'Not found' })
  const read = await markThreadRead(threadId, req.userId!)
  res.json({ read })
})

messagesRouter.get('/:messageId/info', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const message = await prisma.message.findUnique({
    where: { id: param(req, 'messageId') },
    include: {
      sender: true,
      thread: { select: { isGroup: true } },
      receipts: { include: { user: true }, orderBy: { readAt: 'asc' } },
    },
  })
  // Only the sender can open "Message info".
  if (!message || message.senderId !== userId) return res.status(404).json({ message: 'Not found' })
  const settings = await loadReceiptSettings([userId, ...message.receipts.map((r) => r.userId)])
  res.json({
    message: serializeMessage(message, userId, message.thread.isGroup, settings),
    recipients: message.receipts.map((r) => ({
      user: toPublicUser(r.user),
      deliveredAt: r.deliveredAt,
      readAt: canSeeRead(message.thread.isGroup, userId, r.userId, settings) ? r.readAt : null,
    })),
  })
})

messagesRouter.post('/threads', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const parsed = newChatSchema.safeParse(req.body)
  if (!parsed.success) return badRequest(res, parsed.error)
  const { toUserId, content } = parsed.data
  if (toUserId === userId) return res.status(400).json({ message: 'Cannot message yourself' })
  if (!(await prisma.user.findUnique({ where: { id: toUserId }, select: { id: true } }))) {
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
      data: { participants: { create: [{ userId }, { userId: toUserId }] } },
      include: { participants: true },
    })
  }
  const message = await createMessage(thread.id, userId, { content })
  res.status(201).json({ threadId: thread.id, message })
})

messagesRouter.post('/groups', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const parsed = newGroupSchema.safeParse(req.body)
  if (!parsed.success) return badRequest(res, parsed.error)
  const { name, memberIds, content } = parsed.data
  const found = await prisma.user.findMany({ where: { id: { in: memberIds } }, select: { id: true } })
  const ids = [...new Set([userId, ...found.map((u) => u.id)])]
  const thread = await prisma.thread.create({
    data: {
      isGroup: true,
      name,
      avatarUrl: `https://picsum.photos/seed/g${Date.now()}/96/96`,
      participants: {
        create: ids.map((id) => ({ userId: id, isAdmin: id === userId })),
      },
    },
  })
  if (content) await createMessage(thread.id, userId, { content })
  res.status(201).json({ threadId: thread.id })
})

messagesRouter.post('/threads/:id', async (req: AuthRequest, res) => {
  const parsed = sendSchema.safeParse(req.body)
  if (!parsed.success) return badRequest(res, parsed.error)
  const message = await createMessage(param(req, 'id'), req.userId!, parsed.data)
  if (!message) return res.status(404).json({ message: 'Not found' })
  res.status(201).json(message)
})
