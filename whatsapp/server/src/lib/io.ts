import type { Server } from 'socket.io'

let io: Server | null = null

export function setIO(server: Server) {
  io = server
}

/** Emit to every socket the user has open (each socket joins `user:<id>`). */
export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload)
}
