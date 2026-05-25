import { http, HttpResponse } from 'msw'
import { generateId, getDb, requireUserId, setDb } from '../db'

export const jobHandlers = [
  http.get('/api/jobs', ({ request }) => {
    const url = new URL(request.url)
    const q = (url.searchParams.get('q') ?? '').toLowerCase()
    const remote = url.searchParams.get('remote') === 'true'
    const db = getDb()
    let jobs = [...db.jobs]
    if (q) {
      jobs = jobs.filter((j) => {
        const co = db.companies.find((c) => c.id === j.companyId)
        return (
          j.title.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q) ||
          (co?.name.toLowerCase().includes(q) ?? false)
        )
      })
    }
    if (remote) jobs = jobs.filter((j) => j.remote)
    return HttpResponse.json(
      jobs.map((j) => ({
        ...j,
        company: db.companies.find((c) => c.id === j.companyId),
      })),
    )
  }),

  http.get('/api/jobs/:id', ({ params }) => {
    const db = getDb()
    const job = db.jobs.find((j) => j.id === params.id)
    if (!job) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    return HttpResponse.json({
      ...job,
      company: db.companies.find((c) => c.id === job.companyId),
    })
  }),

  http.post('/api/jobs/:id/apply', async ({ params, request }) => {
    const userId = requireUserId(request.headers)
    if (!userId) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const { resumeName } = (await request.json()) as { resumeName: string }
    const app = {
      id: generateId('ja'),
      jobId: params.id as string,
      userId,
      resumeName: resumeName || 'resume.pdf',
      appliedAt: new Date().toISOString(),
    }
    setDb((d) => {
      d.jobApplications.push(app)
      const job = d.jobs.find((j) => j.id === params.id)
      if (job) job.applicants += 1
    })
    return HttpResponse.json(app)
  }),

  http.get('/api/jobs/saved', ({ request }) => {
    const userId = requireUserId(request.headers)
    if (!userId) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const db = getDb()
    const ids = db.savedJobIds[userId] ?? []
    return HttpResponse.json(
      ids
        .map((id) => db.jobs.find((j) => j.id === id))
        .filter(Boolean)
        .map((j) => ({
          ...j!,
          company: db.companies.find((c) => c.id === j!.companyId),
        })),
    )
  }),

  http.post('/api/jobs/:id/save', ({ params, request }) => {
    const userId = requireUserId(request.headers)
    if (!userId) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    setDb((d) => {
      if (!d.savedJobIds[userId]) d.savedJobIds[userId] = []
      const ids = d.savedJobIds[userId]
      const jobId = params.id as string
      if (ids.includes(jobId)) {
        d.savedJobIds[userId] = ids.filter((id) => id !== jobId)
      } else {
        ids.push(jobId)
      }
    })
    return HttpResponse.json({ ok: true })
  }),

  http.post('/api/job-alerts', async ({ request }) => {
    const userId = requireUserId(request.headers)
    if (!userId) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const body = (await request.json()) as { query: string; location: string }
    const alert = {
      id: generateId('alert'),
      userId,
      query: body.query,
      location: body.location,
      createdAt: new Date().toISOString(),
    }
    setDb((d) => d.jobAlerts.push(alert))
    return HttpResponse.json(alert)
  }),
]
