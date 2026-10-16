import { io, type Socket } from 'socket.io-client'

/** One socket per logged-in tab, shared by the layout (listeners) and chats (typing / read events). */
let socket: Socket | null = null
let socketToken: string | null = null

export function connectSocket(token: string) {
  if (socket && socketToken === token) return socket
  socket?.disconnect()
  socketToken = token
  socket = io('/', { auth: { token }, path: '/socket.io' })
  return socket
}

export function getSocket() {
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
  socketToken = null
}
