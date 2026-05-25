import { http, HttpResponse } from 'msw'
import { getDb, requireUserId, setDb, toPublicUser } from '../db'

export const networkHandlers = [
  http.get('/api/network', ({ request }) => {
    const userId = requireUserId(request.headers)
    if (!userId) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const db = getDb()
    const user = db.users.find((u) => u.id === userId)!
    const invitations = db.invitations.filter((i) => i.toUserId === userId)
    const sent = db.invitations.filter((i) => i.fromUserId === userId)
    const connections = db.users
      .filter((u) => user.connectionIds.includes(u.id))
      .map(toPublicUser)
    const suggestions = db.users
      .filter(
        (u) =>
          u.id !== userId &&
          !user.connectionIds.includes(u.id) &&
          !invitations.some((i) => i.fromUserId === u.id && i.toUserId === userId) &&
          !sent.some((i) => i.fromUserId === userId && i.toUserId === u.id),
      )
      .slice(0, 8)
      .map(toPublicUser)
    return HttpResponse.json({
      invitations: invitations.map((i) => ({
        ...i,
        from: toPublicUser(db.users.find((u) => u.id === i.fromUserId)!),
      })),
      connections,
      suggestions,
    })
  }),

  http.post('/api/invitations/:id/accept', ({ params, request }) => {
    const userId = requireUserId(request.headers)
    if (!userId) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    setDb((d) => {
      const inv = d.invitations.find((i) => i.id === params.id)
      if (!inv) return
      const from = d.users.find((u) => u.id === inv.fromUserId)
      const to = d.users.find((u) => u.id === inv.toUserId)
      if (from && to) {
        if (!from.connectionIds.includes(to.id)) from.connectionIds.push(to.id)
        if (!to.connectionIds.includes(from.id)) to.connectionIds.push(from.id)
      }
      d.invitations = d.invitations.filter((i) => i.id !== params.id)
    })
    return HttpResponse.json({ ok: true })
  }),

  http.post('/api/invitations/:id/ignore', ({ params }) => {
    setDb((d) => {
      d.invitations = d.invitations.filter((i) => i.id !== params.id)
    })
    return HttpResponse.json({ ok: true })
  }),
]
