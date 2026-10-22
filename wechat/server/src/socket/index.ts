import type { Server as HttpServer } from 'http'
import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'
import { config } from '../config.js'
import { verifyAccessToken } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'
import { createMessage } from '../services/groupChats.js'
import { setIo } from './emitter.js'

export async function setupSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: config.clientUrl, credentials: true },
  })
  setIo(io)

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
    socket.join(`user:${userId}`)

    socket.on('message:send', async (data: { threadId: string; content: string }) => {
      try {
        const content = typeof data?.content === 'string' ? data.content.trim().slice(0, 5000) : ''
        if (!content || typeof data.threadId !== 'string') return
        const member = await prisma.threadParticipant.findUnique({
          where: { threadId_userId: { threadId: data.threadId, userId } },
        })
        if (!member) return socket.emit('error:message', { message: 'You are not a member of this chat' })
        const msg = await createMessage({ threadId: data.threadId, senderId: userId, content })
        socket.emit('message:sent', msg)
      } catch (e) {
        console.error('message:send failed', e)
        socket.emit('error:message', { message: 'Could not send message' })
      }
    })

    socket.on('typing', (data: { threadId: string }) => {
      socket.to(`thread:${data.threadId}`).emit('typing', { userId, threadId: data.threadId })
    })

    socket.on('thread:join', async (threadId: string) => {
      try {
        if (typeof threadId !== 'string') return
        const member = await prisma.threadParticipant.findUnique({
          where: { threadId_userId: { threadId, userId } },
        })
        if (member) socket.join(`thread:${threadId}`)
      } catch (e) {
        console.error('thread:join failed', e)
      }
    })
  })

  return io
}
