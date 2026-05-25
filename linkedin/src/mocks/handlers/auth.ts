import { http, HttpResponse } from 'msw'
import { generateId, getDb, setDb, toPublicUser } from '../db'

export const authHandlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const { email, password } = (await request.json()) as {
      email: string
      password: string
    }
    const db = getDb()
    const user = db.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
    )
    if (!user) {
      return HttpResponse.json({ message: 'Invalid email or password' }, { status: 401 })
    }
    const token = generateId('tok')
    setDb((d) => {
      d.sessions[token] = user.id
    })
    return HttpResponse.json({ token, user: toPublicUser(user) })
  }),

  http.post('/api/auth/register', async ({ request }) => {
    const body = (await request.json()) as {
      email: string
      password: string
      firstName: string
      lastName: string
      headline: string
      location: string
    }
    const db = getDb()
    if (db.users.some((u) => u.email.toLowerCase() === body.email.toLowerCase())) {
      return HttpResponse.json({ message: 'Email already registered' }, { status: 400 })
    }
    const username = `${body.firstName}-${body.lastName}`
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
    const id = generateId('u')
    const user = {
      id,
      email: body.email,
      password: body.password,
      username: `${username}-${id.slice(-4)}`,
      firstName: body.firstName,
      lastName: body.lastName,
      headline: body.headline,
      location: body.location,
      avatarUrl: `https://i.pravatar.cc/150?u=${id}`,
      coverUrl: `https://picsum.photos/seed/${id}/1200/300`,
      about: '',
      connectionIds: [] as string[],
      followerIds: [] as string[],
      followingIds: [] as string[],
      experience: [],
      education: [],
      skills: [],
    }
    setDb((d) => {
      d.users.push(user)
      d.settings.push({
        userId: id,
        emailNotifications: true,
        pushNotifications: true,
        profileVisibility: 'public',
        activityVisibility: true,
        messagingFrom: 'connections',
        language: 'en',
        theme: 'light',
      })
    })
    const token = generateId('tok')
    setDb((d) => {
      d.sessions[token] = id
    })
    return HttpResponse.json({ token, user: toPublicUser(user) })
  }),

  http.post('/api/auth/forgot-password', async () => {
    return HttpResponse.json({ message: 'Reset link sent (mock)' })
  }),

  http.get('/api/auth/me', ({ request }) => {
    const auth = request.headers.get('Authorization')
    const token = auth?.replace('Bearer ', '') ?? localStorage.getItem('linkedin-auth-token')
    if (!token) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const db = getDb()
    const userId = db.sessions[token]
    const user = db.users.find((u) => u.id === userId)
    if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    return HttpResponse.json(toPublicUser(user))
  }),
]
