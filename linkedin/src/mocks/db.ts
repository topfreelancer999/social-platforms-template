import { initialSeed, type MockDatabase } from './seed'

const STORAGE_KEY = 'linkedin-mock-db'

let db: MockDatabase = loadDb()

function loadDb(): MockDatabase {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as MockDatabase
      return mergeWithSeed(parsed)
    }
  } catch {
    /* ignore */
  }
  return structuredClone(initialSeed)
}

function mergeWithSeed(stored: MockDatabase): MockDatabase {
  const seed = structuredClone(initialSeed)
  return {
    ...seed,
    ...stored,
    users: mergeUsers(seed.users, stored.users),
    posts: [...stored.posts, ...seed.posts.filter((p) => !stored.posts.some((s) => s.id === p.id))],
    comments: [
      ...stored.comments,
      ...seed.comments.filter((c) => !stored.comments.some((s) => s.id === c.id)),
    ],
  }
}

function mergeUsers(seedUsers: MockDatabase['users'], storedUsers: MockDatabase['users']) {
  return seedUsers.map((su) => {
    const found = storedUsers.find((u) => u.id === su.id)
    return found ? { ...su, ...found } : su
  }).concat(storedUsers.filter((u) => !seedUsers.some((s) => s.id === u.id)))
}

export function getDb(): MockDatabase {
  return db
}

export function setDb(updater: (draft: MockDatabase) => void) {
  const next = structuredClone(db)
  updater(next)
  db = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    /* ignore */
  }
}

export function resetDb() {
  db = structuredClone(initialSeed)
  localStorage.removeItem(STORAGE_KEY)
}

export function toPublicUser(user: MockDatabase['users'][0]) {
  const { email: _e, password: _p, ...rest } = user
  return rest
}

export function getCurrentUserId(): string | null {
  const token = localStorage.getItem('linkedin-auth-token')
  if (!token) return null
  const userId = db.sessions[token]
  return userId ?? null
}

export function requireUserId(headers: Headers): string | null {
  const auth = headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return getCurrentUserId()
  const token = auth.slice(7)
  return db.sessions[token] ?? null
}

export function generateId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
