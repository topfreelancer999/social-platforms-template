import type { Server as HttpServer } from 'http'
import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'
import { config } from '../config.js'
import { verifyAccessToken } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'

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
    socket.join(`user:${userId}`)

    socket.on('channel:join', (channelId: string) => {
      socket.join(`channel:${channelId}`)
    })

    socket.on('channel:message', async (data: { channelId: string; content: string }) => {
      const channel = await prisma.channel.findUnique({ where: { id: data.channelId } })
      if (!channel) return
      const member = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId: channel.serverId, userId } },
      })
      if (!member) return
      const msg = await prisma.channelMessage.create({
        data: { channelId: data.channelId, authorId: userId, content: data.content },
        include: { author: true },
      })
      const payload = {
        id: msg.id,
        content: msg.content,
        createdAt: msg.createdAt,
        channelId: data.channelId,
        author: toPublicUser(msg.author),
      }
      io.to(`channel:${data.channelId}`).emit('channel:message', payload)
    })

    socket.on('message:send', async (data: { threadId: string; content: string }) => {
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
    })

    socket.on('typing', (data: { threadId: string }) => {
      socket.to(`thread:${data.threadId}`).emit('typing', { userId, threadId: data.threadId })
    })

    socket.on('thread:join', (threadId: string) => {
      socket.join(`thread:${threadId}`)
    })
  })

  return io
}
