import type { Server } from 'socket.io'

/** Lets REST routes push real-time events once `setupSocket` has created the server. */
let io: Server | null = null

export function setIo(server: Server) {
  io = server
}

/** Emit to each user's personal room (`user:<id>`), joined on connection. */
export function emitToUsers(userIds: Iterable<string>, event: string, payload: unknown) {
  if (!io) return
  for (const id of new Set(userIds)) io.to(`user:${id}`).emit(event, payload)
}
