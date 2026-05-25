import { http, HttpResponse } from 'msw'
import { generateId, getDb, requireUserId, setDb, toPublicUser } from '../db'

export const messageHandlers = [
  http.get('/api/messages/threads', ({ request }) => {
    const userId = requireUserId(request.headers)
    if (!userId) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const db = getDb()
    const threads = db.threads
      .filter((t) => t.participantIds.includes(userId))
      .sort(
        (a, b) =>
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
      )
      .map((t) => {
        const otherId = t.participantIds.find((id) => id !== userId)!
        const other = db.users.find((u) => u.id === otherId)!
        const msgs = db.messages.filter((m) => m.threadId === t.id)
        const last = msgs[msgs.length - 1]
        return {
          ...t,
          participant: toPublicUser(other),
          lastMessage: last,
          unread: t.unreadBy[userId] ?? 0,
        }
      })
    return HttpResponse.json(threads)
  }),

  http.get('/api/messages/threads/:id', ({ params, request }) => {
    const userId = requireUserId(request.headers)
    if (!userId) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const db = getDb()
    const thread = db.threads.find((t) => t.id === params.id)
    if (!thread) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    setDb((d) => {
      const t = d.threads.find((x) => x.id === params.id)
      if (t) t.unreadBy[userId] = 0
      d.messages
        .filter((m) => m.threadId === params.id && m.senderId !== userId)
        .forEach((m) => (m.read = true))
    })
    const messages = getDb().messages.filter((m) => m.threadId === params.id)
    const otherId = thread.participantIds.find((id) => id !== userId)!
    return HttpResponse.json({
      thread,
      participant: toPublicUser(getDb().users.find((u) => u.id === otherId)!),
      messages: messages.map((m) => ({
        ...m,
        sender: toPublicUser(getDb().users.find((u) => u.id === m.senderId)!),
      })),
    })
  }),

  http.post('/api/messages/threads/:id', async ({ params, request }) => {
    const userId = requireUserId(request.headers)
    if (!userId) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const { content } = (await request.json()) as { content: string }
    const msg = {
      id: generateId('m'),
      threadId: params.id as string,
      senderId: userId,
      content,
      createdAt: new Date().toISOString(),
      read: false,
    }
    setDb((d) => {
      d.messages.push(msg)
      const t = d.threads.find((x) => x.id === params.id)
      if (t) {
        t.lastMessageAt = msg.createdAt
        const other = t.participantIds.find((id) => id !== userId)!
        t.unreadBy[other] = (t.unreadBy[other] ?? 0) + 1
      }
    })
    return HttpResponse.json({
      ...msg,
      sender: toPublicUser(getDb().users.find((u) => u.id === userId)!),
    })
  }),

  http.post('/api/messages/threads', async ({ request }) => {
    const userId = requireUserId(request.headers)
    if (!userId) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const { toUserId, content } = (await request.json()) as {
      toUserId: string
      content: string
    }
    const db = getDb()
    let thread = db.threads.find(
      (t) =>
        t.participantIds.includes(userId) && t.participantIds.includes(toUserId),
    )
    if (!thread) {
      thread = {
        id: generateId('t'),
        participantIds: [userId, toUserId],
        lastMessageAt: new Date().toISOString(),
        unreadBy: { [userId]: 0, [toUserId]: 0 },
      }
      setDb((d) => d.threads.push(thread!))
    }
    const msg = {
      id: generateId('m'),
      threadId: thread!.id,
      senderId: userId,
      content,
      createdAt: new Date().toISOString(),
      read: false,
    }
    setDb((d) => {
      d.messages.push(msg)
      const t = d.threads.find((x) => x.id === thread!.id)
      if (t) {
        t.lastMessageAt = msg.createdAt
        t.unreadBy[toUserId] = (t.unreadBy[toUserId] ?? 0) + 1
      }
    })
    return HttpResponse.json({ threadId: thread!.id, message: msg })
  }),
]
