import type { Server } from 'socket.io'

/** Lets HTTP routes broadcast without importing the socket setup (avoids a cycle). */
let io: Server | null = null

export function setIO(server: Server) {
  io = server
}

export function emitToServer(serverId: string, event: string, payload: Record<string, unknown> = {}) {
  io?.to(`server:${serverId}`).emit(event, { serverId, ...payload })
}

export function emitToChannel(channelId: string, event: string, payload: unknown) {
  io?.to(`channel:${channelId}`).emit(event, payload)
}

/** Add every live socket of a user to a server room (e.g. right after joining). */
export function joinUserToServer(userId: string, serverId: string) {
  io?.in(`user:${userId}`).socketsJoin(`server:${serverId}`)
}

/** Remove a user's sockets from a server room and its channel rooms (after leaving). */
export function removeUserFromServer(userId: string, serverId: string, channelIds: string[]) {
  io?.in(`user:${userId}`).socketsLeave([`server:${serverId}`, ...channelIds.map((id) => `channel:${id}`)])
}

/**
 * Drop all sockets in a server from its channel rooms after permissions change;
 * clients re-request `channel:join`, which re-checks VIEW_CHANNEL.
 */
export function resetChannelRooms(channelIds: string[]) {
  if (!io || channelIds.length === 0) return
  for (const id of channelIds) io.in(`channel:${id}`).socketsLeave(`channel:${id}`)
}
