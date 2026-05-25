import { http, HttpResponse } from 'msw'
import type { SearchTab } from '@/types'
import { getDb, toPublicUser } from '../db'

export const searchHandlers = [
  http.get('/api/search', ({ request }) => {
    const url = new URL(request.url)
    const q = (url.searchParams.get('q') ?? '').toLowerCase()
    const type = (url.searchParams.get('type') ?? 'all') as SearchTab
    const db = getDb()

    const match = (text: string) => !q || text.toLowerCase().includes(q)

    const people = db.users
      .filter(
        (u) =>
          match(`${u.firstName} ${u.lastName}`) ||
          match(u.headline) ||
          match(u.location),
      )
      .map(toPublicUser)

    const jobs = db.jobs.filter(
      (j) => {
        const company = db.companies.find((c) => c.id === j.companyId)
        return (
          match(j.title) ||
          match(j.location) ||
          match(company?.name ?? '')
        )
      },
    ).map((j) => ({
      ...j,
      company: db.companies.find((c) => c.id === j.companyId),
    }))

    const companies = db.companies.filter(
      (c) => match(c.name) || match(c.industry) || match(c.tagline),
    )

    const posts = db.posts
      .filter((p) => match(p.content))
      .map((p) => ({
        ...p,
        author: toPublicUser(db.users.find((u) => u.id === p.authorId)!),
      }))

    const groups = db.groups.filter(
      (g) => match(g.name) || match(g.description),
    )

    const results =
      type === 'people'
        ? { people }
        : type === 'jobs'
          ? { jobs }
          : type === 'companies'
            ? { companies }
            : type === 'posts'
              ? { posts }
              : type === 'groups'
                ? { groups }
                : { people, jobs, companies, posts, groups }

    return HttpResponse.json(results)
  }),
]
