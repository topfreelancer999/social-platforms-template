import type { Server } from 'socket.io'

/** Socket.io server handle so HTTP routes can push realtime events. */
let io: Server | null = null

export function setRealtime(server: Server) {
  io = server
}

export function emitTo(room: string, event: string, payload: unknown) {
  io?.to(room).emit(event, payload)
}

export const rooms = {
  user: (userId: string) => `user:${userId}`,
  post: (postId: string) => `post:${postId}`,
}
