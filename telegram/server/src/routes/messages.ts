import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { HttpError, parseBody } from '../lib/http.js'
import {
  MAX_MESSAGE_LENGTH,
  adminThreadIds,
  createMessage,
  deleteMessages,
  editMessage,
  forwardMessages,
  messageInclude,
  serializeMessage,
} from '../lib/messages.js'

export const messagesRouter = Router()
messagesRouter.use(requireAuth)

const id = z.string().min(1).max(64)
const content = z
  .string({ required_error: 'Message text is required' })
  .trim()
  .min(1, 'Message cannot be empty')
  .max(MAX_MESSAGE_LENGTH, `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)`)

const startSchema = z.object({ toUserId: id, content })
const sendSchema = z.object({ content, replyToId: id.nullish() })
const editSchema = z.object({ content })
const deleteSchema = z.object({
  messageIds: z.array(id).min(1, 'Select at least one message').max(100),
  forEveryone: z.boolean().default(false),
})
const forwardSchema = z.object({
  messageIds: z.array(id).min(1, 'Select at least one message').max(100),
  toThreadIds: z.array(id).min(1, 'Choose at least one chat').max(20),
  hideSender: z.boolean().default(false),
})

function threadPreview(
  thread: {
    isGroup: boolean
    name: string | null
    avatarUrl: string | null
    participants: { userId: string; user: Parameters<typeof toPublicUser>[0] }[]
    messages: { content: string; createdAt: Date; senderId: string; editedAt: Date | null; forwardedFromName: string | null }[]
  },
  userId: string,
) {
  const other = thread.participants.find((x) => x.userId !== userId)
  const last = thread.messages[0]
  return {
    title: thread.isGroup ? thread.name : other ? (other.user.displayName || other.user.firstName) : 'Chat',
    avatarUrl: thread.isGroup ? thread.avatarUrl : other?.user.avatarUrl,
    isGroup: thread.isGroup,
    lastMessage: last
      ? {
          content: last.content,
          createdAt: last.createdAt,
          senderId: last.senderId,
          edited: !!last.editedAt,
          forwarded: !!last.forwardedFromName,
        }
      : undefined,
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
          // Preview skips messages this user deleted for themselves.
          messages: { where: { hiddenFor: { none: { userId } } }, orderBy: { createdAt: 'desc' }, take: 1 },
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
      messages: {
        where: { hiddenFor: { none: { userId } } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        include: messageInclude,
      },
    },
  })
  if (!thread) return res.status(404).json({ message: 'Not found' })
  if (!thread.participants.some((p) => p.userId === userId)) {
    return res.status(403).json({ message: 'Forbidden' })
  }
  await prisma.threadParticipant.update({
    where: { threadId_userId: { threadId: thread.id, userId } },
    data: { unread: 0 },
  })
  await prisma.message.updateMany({
    where: { threadId: thread.id, senderId: { not: userId }, read: false },
    data: { read: true },
  })
  const hidden = await prisma.messageHidden.findMany({
    where: { userId, message: { threadId: thread.id } },
    select: { messageId: true },
  })
  const hiddenIds = new Set(hidden.map((h) => h.messageId))
  const canModerate = thread.isGroup && (await adminThreadIds([thread.id], userId)).has(thread.id)
  const preview = threadPreview({ ...thread, messages: thread.messages.slice(-1) }, userId)
  res.json({
    thread: { id: thread.id, updatedAt: thread.updatedAt, ...preview, canModerate },
    messages: thread.messages.map((m) => serializeMessage(m, hiddenIds)),
  })
})

messagesRouter.post('/threads', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const { toUserId, content } = parseBody(startSchema, req.body)
  if (toUserId === userId) throw new HttpError(400, 'You cannot start a chat with yourself')
  const recipient = await prisma.user.findUnique({ where: { id: toUserId }, select: { id: true } })
  if (!recipient) throw new HttpError(404, 'User not found')
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
  const msg = await createMessage({ threadId: thread.id, senderId: userId, content })
  res.status(201).json({ threadId: thread.id, message: msg })
})

messagesRouter.post('/threads/:id', async (req: AuthRequest, res) => {
  const { content, replyToId } = parseBody(sendSchema, req.body)
  const msg = await createMessage({ threadId: param(req, 'id'), senderId: req.userId!, content, replyToId })
  res.status(201).json(msg)
})

messagesRouter.post('/forward', async (req: AuthRequest, res) => {
  const body = parseBody(forwardSchema, req.body)
  res.status(201).json(await forwardMessages({ ...body, userId: req.userId! }))
})

/** Batch delete (multi-select); `forEveryone: false` is "delete for me". */
messagesRouter.post('/delete', async (req: AuthRequest, res) => {
  const { messageIds, forEveryone } = parseBody(deleteSchema, req.body)
  res.json(await deleteMessages(messageIds, req.userId!, forEveryone))
})

messagesRouter.patch('/:id', async (req: AuthRequest, res) => {
  const body = parseBody(editSchema, req.body)
  res.json(await editMessage(param(req, 'id'), req.userId!, body.content))
})

/** `DELETE /messages/:id?forEveryone=true` — single-message shorthand for POST /delete. */
messagesRouter.delete('/:id', async (req: AuthRequest, res) => {
  const forEveryone = req.query.forEveryone === 'true' || req.query.forEveryone === '1'
  res.json(await deleteMessages([param(req, 'id')], req.userId!, forEveryone))
})
