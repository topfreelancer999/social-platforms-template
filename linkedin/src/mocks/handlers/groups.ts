import { http, HttpResponse } from 'msw'
import { getDb, requireUserId, setDb, toPublicUser } from '../db'

export const groupHandlers = [
  http.get('/api/groups', () => {
    const db = getDb()
    return HttpResponse.json(db.groups)
  }),

  http.get('/api/groups/:id', ({ params }) => {
    const db = getDb()
    const group = db.groups.find((g) => g.id === params.id)
    if (!group) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const members = group.memberIds
      .map((id) => db.users.find((u) => u.id === id))
      .filter(Boolean)
      .map((u) => toPublicUser(u!))
    const posts = db.posts
      .filter((p) => p.groupId === group.id)
      .map((p) => ({
        ...p,
        author: toPublicUser(db.users.find((u) => u.id === p.authorId)!),
      }))
    return HttpResponse.json({ group, members, posts })
  }),

  http.post('/api/groups/:id/join', ({ params, request }) => {
    const userId = requireUserId(request.headers)
    if (!userId) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    setDb((d) => {
      const g = d.groups.find((x) => x.id === params.id)
      if (g && !g.memberIds.includes(userId)) g.memberIds.push(userId)
    })
    return HttpResponse.json({ ok: true })
  }),

  http.post('/api/groups/:id/leave', ({ params, request }) => {
    const userId = requireUserId(request.headers)
    if (!userId) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    setDb((d) => {
      const g = d.groups.find((x) => x.id === params.id)
      if (g) g.memberIds = g.memberIds.filter((id) => id !== userId)
    })
    return HttpResponse.json({ ok: true })
  }),
]
