import { io, type Socket } from 'socket.io-client'

// One shared connection for app-wide realtime events (vote scores, karma).
let socket: Socket | null = null
let socketToken: string | null = null

export function getSocket(token: string) {
  if (socket && socketToken === token) return socket
  socket?.disconnect()
  socket = io('/', { auth: { token }, path: '/socket.io' })
  socketToken = token
  return socket
}

export function closeSocket() {
  socket?.disconnect()
  socket = null
  socketToken = null
}
