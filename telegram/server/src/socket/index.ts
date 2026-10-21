import type { Server as HttpServer } from 'http'
import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'
import { config } from '../config.js'
import { verifyAccessToken } from '../lib/auth.js'
import { HttpError } from '../lib/http.js'
import { MAX_MESSAGE_LENGTH, createMessage } from '../lib/messages.js'
import { setRealtimeServer } from '../lib/realtime.js'

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

  setRealtimeServer(io)

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

    // Same rules as POST /api/messages/threads/:id; the HTTP path is what the web client uses.
    socket.on(
      'message:send',
      async (
        data: { threadId?: unknown; content?: unknown; replyToId?: unknown },
        ack?: (res: { ok: boolean; message?: unknown; error?: string }) => void,
      ) => {
        const reply = typeof ack === 'function' ? ack : undefined
        try {
          const content = typeof data?.content === 'string' ? data.content.trim() : ''
          if (typeof data?.threadId !== 'string' || !content || content.length > MAX_MESSAGE_LENGTH) {
            throw new HttpError(400, 'Invalid message')
          }
          const message = await createMessage({
            threadId: data.threadId,
            senderId: userId,
            content,
            replyToId: typeof data.replyToId === 'string' ? data.replyToId : null,
          })
          socket.emit('message:sent', message)
          reply?.({ ok: true, message })
        } catch (e) {
          // Never let a rejected handler escape: unhandled rejections crash the process.
          const error = e instanceof HttpError ? e.message : 'Could not send message'
          if (!(e instanceof HttpError)) console.error(e)
          socket.emit('message:error', { error })
          reply?.({ ok: false, error })
        }
      },
    )

    socket.on('typing', (data: { threadId: string }) => {
      socket.to(`thread:${data.threadId}`).emit('typing', { userId, threadId: data.threadId })
    })

    socket.on('thread:join', (threadId: string) => {
      socket.join(`thread:${threadId}`)
    })
  })

  return io
}
