/** `pending` exists only client-side while a send is in flight (clock icon). */
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read'

export type ChatUser = {
  id: string
  username: string
  firstName: string
  lastName: string
  displayName?: string
  avatarUrl: string
}

export type Msg = {
  id: string
  threadId: string
  content: string
  type: string
  mediaUrl?: string | null
  createdAt: string
  senderId: string
  sender: ChatUser
  /** Only set on the viewer's own messages. */
  status: MessageStatus | null
}

export type Participant = ChatUser & {
  isAdmin: boolean
  online: boolean
  lastSeen: string | null
}

export type ThreadDetail = {
  thread: {
    id: string
    title: string
    avatarUrl?: string | null
    isGroup: boolean
    unread: number
    participants: Participant[]
  }
  messages: Msg[]
}

export type ThreadItem = {
  id: string
  title: string
  avatarUrl?: string | null
  isGroup: boolean
  unread: number
  lastMessage: Msg | null
  updatedAt: string
}

export type MessageInfo = {
  message: Msg
  recipients: { user: ChatUser; deliveredAt: string | null; readAt: string | null }[]
}
