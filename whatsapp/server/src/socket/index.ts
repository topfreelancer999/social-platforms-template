import type { Server as HttpServer } from 'http'
import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'
import { z } from 'zod'
import { config } from '../config.js'
import { verifyAccessToken } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'
import { emitToUser, setIO } from '../lib/io.js'
import { socketConnected, socketDisconnected } from '../lib/presence.js'
import { chatPeers, createMessage, markDelivered, markThreadRead } from '../services/messages.js'

const sendSchema = z.object({ threadId: z.string().min(1), content: z.string().trim().min(1).max(4096) })
const typingSchema = z.object({ threadId: z.string().min(1), isTyping: z.boolean() })
const threadSchema = z.object({ threadId: z.string().min(1) })

/** Socket handlers are fire-and-forget; log failures instead of crashing on an unhandled rejection. */
function safe<A extends unknown[]>(fn: (...args: A) => Promise<unknown>) {
  return (...args: A) => {
    fn(...args).catch((e) => console.error('socket handler failed:', e))
  }
}

async function broadcastPresence(userId: string) {
  for (const peer of await chatPeers(userId)) emitToUser(peer, 'presence:update', { userId })
}

export async function setupSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: config.clientUrl, credentials: true },
  })
  setIO(io)

  try {
    if (config.redisUrl) {
      const pub = createClient({ url: config.redisUrl })
      const sub = pub.duplicate()
      await Promise.all([pub.connect(), sub.connect()])
      io.adapter(createAdapter(pub, sub))
    }
  } catch (e) {
    console.warn('Socket.io Redis adapter unavailable:', e)
  }

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined
    if (!token) return next(new Error('Unauthorized'))
    try {
      const payload = verifyAccessToken(token)
      socket.data.userId = payload.userId
      next()
    } catch {
      next(new Error('Unauthorized'))
    }
  })

  io.on('connection', safe(async (socket) => {
    const userId = socket.data.userId as string
    socket.join(`user:${userId}`)

    // Register handlers before any await so early client events aren't dropped.
    socket.on('message:send', safe(async (data: unknown) => {
      const parsed = sendSchema.safeParse(data)
      if (!parsed.success) return
      const message = await createMessage(parsed.data.threadId, userId, { content: parsed.data.content })
      if (message) socket.emit('message:sent', message)
    }))

    socket.on('typing', safe(async (data: unknown) => {
      const parsed = typingSchema.safeParse(data)
      if (!parsed.success) return
      const { threadId, isTyping } = parsed.data
      const participants = await prisma.threadParticipant.findMany({
        where: { threadId },
        select: { userId: true, user: { select: { firstName: true } } },
      })
      const me = participants.find((p) => p.userId === userId)
      if (!me) return
      for (const p of participants) {
        if (p.userId === userId) continue
        emitToUser(p.userId, 'typing', { threadId, userId, name: me.user.firstName, isTyping })
      }
    }))

    socket.on('thread:read', safe(async (data: unknown) => {
      const parsed = threadSchema.safeParse(data)
      if (!parsed.success) return
      const member = await prisma.threadParticipant.findUnique({
        where: { threadId_userId: { threadId: parsed.data.threadId, userId } },
      })
      if (member) await markThreadRead(parsed.data.threadId, userId)
    }))

    socket.on('disconnect', safe(async () => {
      if (!socketDisconnected(userId)) return
      await prisma.user.update({ where: { id: userId }, data: { lastSeen: new Date() } }).catch(() => {})
      await broadcastPresence(userId)
    }))

    const cameOnline = socketConnected(userId)
    // A connected device receives everything that was waiting → double ticks for the senders.
    await markDelivered(userId)
    if (cameOnline) await broadcastPresence(userId)
  }))

  return io
}
