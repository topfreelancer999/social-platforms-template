import type { Server } from 'socket.io'

let io: Server | null = null

export function setRealtimeServer(server: Server) {
  io = server
}

/** Emits to each user's personal `user:<id>` room (all of their tabs/devices). */
export function emitToUsers(userIds: Iterable<string>, event: string, payload: unknown) {
  if (!io) return
  const rooms = [...new Set(userIds)].map((id) => `user:${id}`)
  if (rooms.length) io.to(rooms).emit(event, payload)
}
