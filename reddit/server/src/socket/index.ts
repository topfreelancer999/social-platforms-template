import type { Server as HttpServer } from 'http'
import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'
import { config } from '../config.js'
import { verifyAccessToken } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import { rooms, setRealtime } from '../lib/realtime.js'

export async function setupSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: config.clientUrl, credentials: true },
  })

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

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string
    socket.join(rooms.user(userId))

    socket.on('message:send', async (data: { threadId: string; content: string }) => {
      // Async listeners must not reject: an unhandled rejection crashes Node.
      try {
        await sendMessage(data)
      } catch (e) {
        console.error('message:send failed', e)
        socket.emit('message:error', { threadId: data?.threadId })
      }
    })

    async function sendMessage(data: { threadId: string; content: string }) {
      const msg = await prisma.message.create({
        data: { threadId: data.threadId, senderId: userId, content: data.content },
        include: { sender: true },
      })
      await prisma.thread.update({
        where: { id: data.threadId },
        data: { updatedAt: new Date() },
      })
      const others = await prisma.threadParticipant.findMany({
        where: { threadId: data.threadId, userId: { not: userId } },
      })
      for (const o of others) {
        await prisma.threadParticipant.update({
          where: { id: o.id },
          data: { unread: { increment: 1 } },
        })
        io.to(`user:${o.userId}`).emit('message:new', {
          threadId: data.threadId,
          message: { ...msg, sender: toPublicUser(msg.sender) },
        })
      }
      socket.emit('message:sent', { ...msg, sender: toPublicUser(msg.sender) })
    }

    socket.on('typing', (data: { threadId: string }) => {
      socket.to(`thread:${data.threadId}`).emit('typing', { userId, threadId: data.threadId })
    })

    socket.on('thread:join', (threadId: string) => {
      socket.join(`thread:${threadId}`)
    })

    // Live vote scores for a post page and its comments.
    socket.on('post:watch', (postId: unknown) => {
      if (typeof postId === 'string' && postId.length <= 64) socket.join(rooms.post(postId))
    })
    socket.on('post:unwatch', (postId: unknown) => {
      if (typeof postId === 'string') socket.leave(rooms.post(postId))
    })
  })

  setRealtime(io)
  return io
}
