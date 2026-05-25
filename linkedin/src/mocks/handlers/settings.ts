import { http, HttpResponse } from 'msw'
import { getDb, requireUserId, setDb } from '../db'

export const settingsHandlers = [
  http.get('/api/settings', ({ request }) => {
    const userId = requireUserId(request.headers)
    if (!userId) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const settings = getDb().settings.find((s) => s.userId === userId)
    const user = getDb().users.find((u) => u.id === userId)
    return HttpResponse.json({ settings, email: user?.email })
  }),

  http.patch('/api/settings', async ({ request }) => {
    const userId = requireUserId(request.headers)
    if (!userId) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    setDb((d) => {
      const idx = d.settings.findIndex((s) => s.userId === userId)
      if (idx >= 0) d.settings[idx] = { ...d.settings[idx], ...(body as object) }
    })
    return HttpResponse.json(getDb().settings.find((s) => s.userId === userId))
  }),

  http.get('/api/events', () => HttpResponse.json(getDb().events)),

  http.post('/api/events/:id/rsvp', ({ params, request }) => {
    const userId = requireUserId(request.headers)
    if (!userId) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    setDb((d) => {
      const ev = d.events.find((e) => e.id === params.id)
      if (ev && !ev.attendeeIds.includes(userId)) ev.attendeeIds.push(userId)
    })
    return HttpResponse.json({ ok: true })
  }),
]
