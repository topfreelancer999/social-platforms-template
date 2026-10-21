export type MsgSender = {
  id: string
  username: string
  displayName?: string
  firstName: string
  lastName: string
  avatarUrl: string
}

export type Msg = {
  id: string
  threadId: string
  senderId: string
  sender: MsgSender
  content: string
  type: 'TEXT' | 'PHOTO' | 'FILE'
  mediaUrl: string | null
  read: boolean
  createdAt: string
  editedAt: string | null
  replyTo: { id: string; senderId: string; senderName: string; content: string; type: Msg['type'] } | null
  /** The quoted message was deleted (for everyone, or by this viewer for themselves). */
  replyToDeleted: boolean
  forwardedFrom: { userId: string | null; name: string; date: string | null } | null
}

export type ThreadInfo = {
  id: string
  title: string
  avatarUrl?: string | null
  isGroup: boolean
  /** Viewer is an admin of the linked group and may delete anyone's messages. */
  canModerate: boolean
}

export type ThreadDetail = { thread: ThreadInfo; messages: Msg[] }

export type ThreadItem = {
  id: string
  title: string
  avatarUrl?: string | null
  unread: number
  isGroup?: boolean
  lastMessage?: { content: string; createdAt: string; senderId: string; edited: boolean; forwarded: boolean }
}

/** Mirrors the server: own text messages are editable for 48 hours. */
export const EDIT_WINDOW_MS = 48 * 60 * 60 * 1000

export function senderName(s: MsgSender) {
  return s.displayName || `${s.firstName} ${s.lastName}`.trim() || s.username
}

export function canEdit(m: Msg, userId: string | undefined, now = Date.now()) {
  return (
    m.senderId === userId &&
    m.type === 'TEXT' &&
    !m.forwardedFrom &&
    now - new Date(m.createdAt).getTime() <= EDIT_WINDOW_MS
  )
}

export function canDeleteForEveryone(m: Msg, userId: string | undefined, thread: ThreadInfo) {
  return m.senderId === userId || (thread.isGroup && thread.canModerate)
}

export function snippet(m: { content: string; type: Msg['type'] }) {
  if (m.type === 'PHOTO') return m.content || 'Photo'
  if (m.type === 'FILE') return m.content || 'File'
  return m.content
}
