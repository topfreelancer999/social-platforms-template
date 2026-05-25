import { http, HttpResponse } from 'msw'
import { getDb, requireUserId, setDb, toPublicUser } from '../db'

export const companyHandlers = [
  http.get('/api/companies/:slug', ({ params }) => {
    const db = getDb()
    const company = db.companies.find((c) => c.slug === params.slug || c.id === params.slug)
    if (!company) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const posts = db.posts.filter((p) => p.companyId === company.id).slice(0, 5)
    const jobs = db.jobs.filter((j) => j.companyId === company.id)
    const people = db.users
      .filter((u) => company.employeeIds.includes(u.id))
      .map(toPublicUser)
    return HttpResponse.json({
      company,
      posts: posts.map((p) => ({
        ...p,
        author: toPublicUser(db.users.find((u) => u.id === p.authorId)!),
      })),
      jobs,
      people,
    })
  }),

  http.post('/api/companies/:id/follow', ({ params, request }) => {
    const userId = requireUserId(request.headers)
    if (!userId) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    setDb((d) => {
      const c = d.companies.find((x) => x.id === params.id || x.slug === params.id)
      if (c && !c.followerIds.includes(userId)) c.followerIds.push(userId)
    })
    return HttpResponse.json({ ok: true })
  }),
]
