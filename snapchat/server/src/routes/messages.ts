import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { streaksFor } from '../lib/streaks.js'

export const messagesRouter = Router()
messagesRouter.use(requireAuth)

function threadPreview(
  thread: {
    isGroup: boolean
    name: string | null
    avatarUrl: string | null
    participants: { userId: string; user: Parameters<typeof toPublicUser>[0] }[]
    messages: { content: string; createdAt: Date }[]
  },
  userId: string,
) {
  const other = thread.participants.find((x) => x.userId !== userId)
  const last = thread.messages[0]
  return {
    title: thread.isGroup ? thread.name : other ? (other.user.displayName || other.user.firstName) : 'Chat',
    avatarUrl: thread.isGroup ? thread.avatarUrl : other?.user.avatarUrl,
    isGroup: thread.isGroup,
    lastMessage: last,
  }
}

type SnapStatus = 'NEW_SNAP' | 'RECEIVED' | 'DELIVERED' | 'OPENED'

/**
 * Snapchat-style chat list: one row per friend with the Snap status, the 1:1 thread preview and
 * the live streak. "New Snap" wins over everything; otherwise the most recent snap decides.
 */
messagesRouter.get('/inbox', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const now = new Date()
  const friendships = await prisma.friendship.findMany({
    where: { status: 'ACCEPTED', OR: [{ senderId: userId }, { receiverId: userId }] },
    include: { sender: true, receiver: true },
  })
  const friends = friendships.map((f) => (f.senderId === userId ? f.receiver : f.sender))
  const friendIds = friends.map((f) => f.id)

  const [streaks, unopened, threads] = await Promise.all([
    streaksFor(prisma, userId, now),
    prisma.directSnap.findMany({
      where: { recipientId: userId, openedAt: null, senderId: { in: friendIds } },
      select: { id: true, senderId: true, kind: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.threadParticipant.findMany({
      where: { userId, thread: { isGroup: false } },
      include: {
        thread: {
          include: {
            participants: { select: { userId: true } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    }),
  ])
  // Latest snap in either direction, per friend (small N: one indexed lookup each).
  const latest = await Promise.all(
    friendIds.map((id) =>
      prisma.directSnap.findFirst({
        where: {
          OR: [
            { senderId: userId, recipientId: id },
            { senderId: id, recipientId: userId },
          ],
        },
        select: { id: true, senderId: true, kind: true, createdAt: true, openedAt: true },
        orderBy: { createdAt: 'desc' },
      }),
    ),
  )

  const chats = friends.map((friend, i) => {
    const newSnaps = unopened.filter((s) => s.senderId === friend.id)
    const last = latest[i]
    let snap: { id: string; status: SnapStatus; kind: string; at: Date; count: number } | null = null
    if (newSnaps.length) {
      const oldest = newSnaps[0]
      snap = { id: oldest.id, status: 'NEW_SNAP', kind: oldest.kind, at: newSnaps[newSnaps.length - 1].createdAt, count: newSnaps.length }
    } else if (last) {
      const mine = last.senderId === userId
      const status: SnapStatus = mine ? (last.openedAt ? 'OPENED' : 'DELIVERED') : 'RECEIVED'
      snap = { id: last.id, status, kind: last.kind, at: last.openedAt ?? last.createdAt, count: 0 }
    }
    const tp = threads.find(
      (t) => t.thread.participants.length === 2 && t.thread.participants.some((p) => p.userId === friend.id),
    )
    const msg = tp?.thread.messages[0]
    const lastMessage = msg ? { content: msg.content, createdAt: msg.createdAt, fromMe: msg.senderId === userId } : null
    const updatedAt = [snap?.at, msg?.createdAt].reduce<Date>(
      (a, b) => (b && b > a ? b : a),
      new Date(0),
    )
    return {
      friend: {
        id: friend.id,
        username: friend.username,
        displayName: friend.displayName || friend.firstName,
        avatarUrl: friend.avatarUrl,
      },
      threadId: tp?.threadId ?? null,
      unread: tp?.unread ?? 0,
      lastMessage,
      snap,
      streak: streaks.get(friend.id) ?? null,
      updatedAt,
    }
  })
  chats.sort((a, b) => {
    // Unopened Snaps first, then most recent activity.
    const an = a.snap?.status === 'NEW_SNAP' ? 1 : 0
    const bn = b.snap?.status === 'NEW_SNAP' ? 1 : 0
    return bn - an || b.updatedAt.getTime() - a.updatedAt.getTime()
  })
  res.json({ chats })
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
  if (!thread.participants.some((p) => p.userId === userId)) {
    return res.status(403).json({ message: 'Forbidden' })
  }
  await prisma.threadParticipant.update({
    where: { threadId_userId: { threadId: thread.id, userId } },
    data: { unread: 0 },
  })
  await prisma.message.updateMany({
    where: { threadId: thread.id, senderId: { not: userId } },
    data: { read: true },
  })
  const preview = threadPreview({ ...thread, messages: thread.messages.slice(-1) }, userId)
  res.json({
    thread: { id: thread.id, updatedAt: thread.updatedAt, ...preview },
    messages: thread.messages.map((m) => ({
      id: m.id,
      content: m.content,
      read: m.read,
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
      data: { participants: { create: [{ userId }, { userId: toUserId }] } },
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
  res.status(201).json({
    id: msg.id,
    content: msg.content,
    read: msg.read,
    createdAt: msg.createdAt,
    senderId: msg.senderId,
    sender: toPublicUser(msg.sender),
  })
})
