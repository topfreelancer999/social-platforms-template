import { http, HttpResponse } from 'msw'
import { getDb, requireUserId, setDb } from '../db'

export const notificationHandlers = [
  http.get('/api/notifications', ({ request }) => {
    const userId = requireUserId(request.headers)
    if (!userId) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const db = getDb()
    const items = db.notifications
      .filter((n) => n.userId === userId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    const unread = items.filter((n) => !n.read).length
    return HttpResponse.json({ items, unread })
  }),

  http.post('/api/notifications/read-all', ({ request }) => {
    const userId = requireUserId(request.headers)
    if (!userId) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    setDb((d) => {
      d.notifications
        .filter((n) => n.userId === userId)
        .forEach((n) => (n.read = true))
    })
    return HttpResponse.json({ ok: true })
  }),

  http.post('/api/notifications/:id/read', ({ params, request }) => {
    const userId = requireUserId(request.headers)
    if (!userId) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    setDb((d) => {
      const n = d.notifications.find((x) => x.id === params.id && x.userId === userId)
      if (n) n.read = true
    })
    return HttpResponse.json({ ok: true })
  }),
]
