import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { findOrCreateThread, sendDirectMessage } from '../services/messages.js'
import { toStoryPreview } from '../services/stories.js'

export const messagesRouter = Router()
messagesRouter.use(requireAuth)

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
    participants.map((p) => {
      const other = p.thread.participants.find((x) => x.userId !== userId)!
      const last = p.thread.messages[0]
      return {
        id: p.thread.id,
        participant: toPublicUser(other.user),
        lastMessage: last,
        unread: p.unread,
        updatedAt: p.thread.updatedAt,
      }
    }),
  )
})

messagesRouter.get('/threads/:id', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const thread = await prisma.thread.findUnique({
    where: { id: param(req, 'id') },
    include: {
      participants: { include: { user: true } },
      messages: { orderBy: { createdAt: 'asc' }, include: { sender: true, story: true } },
    },
  })
  if (!thread) return res.status(404).json({ message: 'Not found' })
  await prisma.threadParticipant.update({
    where: { threadId_userId: { threadId: thread.id, userId } },
    data: { unread: 0 },
  })
  await prisma.message.updateMany({
    where: { threadId: thread.id, senderId: { not: userId } },
    data: { read: true },
  })
  const other = thread.participants.find((p) => p.userId !== userId)!
  res.json({
    thread: { id: thread.id, updatedAt: thread.updatedAt },
    participant: toPublicUser(other.user),
    messages: thread.messages.map((m) => ({
      ...m,
      sender: toPublicUser(m.sender),
      story: m.story ? toStoryPreview(m.story) : null,
    })),
  })
})

messagesRouter.post('/threads', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const { toUserId, content } = req.body as { toUserId: string; content: string }
  const thread = await findOrCreateThread(userId, toUserId)
  const msg = await sendDirectMessage(thread.id, userId, toUserId, content)
  res.status(201).json({ threadId: thread.id, message: msg })
})

messagesRouter.post('/threads/:id', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const threadId = param(req, 'id')
  const { content } = req.body as { content: string }
  const msg = await prisma.message.create({
    data: { threadId, senderId: userId, content },
    include: { sender: true },
  })
  await prisma.thread.update({ where: { id: threadId }, data: { updatedAt: new Date() } })
  const others = await prisma.threadParticipant.findMany({
    where: { threadId, userId: { not: userId } },
  })
  for (const o of others) {
    await prisma.threadParticipant.update({
      where: { id: o.id },
      data: { unread: { increment: 1 } },
    })
  }
  res.status(201).json({ ...msg, sender: toPublicUser(msg.sender) })
})
