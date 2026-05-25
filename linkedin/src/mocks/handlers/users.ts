import { http, HttpResponse } from 'msw'
import { generateId, getDb, requireUserId, setDb, toPublicUser } from '../db'

function connectionDegree(
  viewerId: string | null,
  targetId: string,
  db: ReturnType<typeof getDb>,
): 1 | 2 | 3 | null {
  if (!viewerId || viewerId === targetId) return null
  const viewer = db.users.find((u) => u.id === viewerId)
  const target = db.users.find((u) => u.id === targetId)
  if (!viewer || !target) return null
  if (viewer.connectionIds.includes(targetId)) return 1
  const mutual = target.connectionIds.some((id) => viewer.connectionIds.includes(id))
  if (mutual) return 2
  return 3
}

export const userHandlers = [
  http.get('/api/users/:id', ({ params, request }) => {
    const viewerId = requireUserId(request.headers)
    const db = getDb()
    const user = db.users.find(
      (u) => u.id === params.id || u.username === params.id,
    )
    if (!user) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const posts = db.posts
      .filter((p) => p.authorId === user.id && !p.repostOfId)
      .slice(0, 10)
    return HttpResponse.json({
      user: toPublicUser(user),
      degree: connectionDegree(viewerId, user.id, db),
      posts: posts.map((p) => ({
        ...p,
        author: toPublicUser(user),
        totalReactions: p.reactions.length,
      })),
    })
  }),

  http.patch('/api/users/me', async ({ request }) => {
    const userId = requireUserId(request.headers)
    if (!userId) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    setDb((d) => {
      const idx = d.users.findIndex((u) => u.id === userId)
      if (idx >= 0) d.users[idx] = { ...d.users[idx], ...(body as object) }
    })
    const user = getDb().users.find((u) => u.id === userId)!
    return HttpResponse.json(toPublicUser(user))
  }),

  http.post('/api/users/:id/connect', ({ params, request }) => {
    const userId = requireUserId(request.headers)
    if (!userId) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const targetId = params.id as string
    setDb((d) => {
      d.invitations.push({
        id: generateId('inv'),
        fromUserId: userId,
        toUserId: targetId,
        createdAt: new Date().toISOString(),
      })
    })
    return HttpResponse.json({ status: 'pending_sent' })
  }),

  http.post('/api/users/:id/follow', ({ params, request }) => {
    const userId = requireUserId(request.headers)
    if (!userId) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const targetId = params.id as string
    setDb((d) => {
      const user = d.users.find((u) => u.id === userId)
      const target = d.users.find((u) => u.id === targetId)
      if (user && !user.followingIds.includes(targetId)) user.followingIds.push(targetId)
      if (target && !target.followerIds.includes(userId)) target.followerIds.push(userId)
    })
    return HttpResponse.json({ ok: true })
  }),
]
