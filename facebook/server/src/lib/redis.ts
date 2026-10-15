import { Redis } from 'ioredis'
import { config } from '../config.js'

const memoryRefresh = new Map<string, { userId: string; expiresAt: number }>()

let redis: Redis | null = null
if (config.redisUrl) {
  redis = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
  })
  redis.on('error', () => {})
}

function pruneMemory() {
  const now = Date.now()
  for (const [id, entry] of memoryRefresh) {
    if (entry.expiresAt <= now) memoryRefresh.delete(id)
  }
}

export async function storeRefreshToken(tokenId: string, userId: string, ttlSeconds: number) {
  if (redis) {
    try {
      await redis.set(`refresh:${tokenId}`, userId, 'EX', ttlSeconds)
      return
    } catch {
      /* fall through to memory */
    }
  }
  pruneMemory()
  memoryRefresh.set(tokenId, { userId, expiresAt: Date.now() + ttlSeconds * 1000 })
}

export async function getRefreshUserId(tokenId: string): Promise<string | null> {
  if (redis) {
    try {
      const value = await redis.get(`refresh:${tokenId}`)
      if (value) return value
    } catch {
      /* fall through */
    }
  }
  pruneMemory()
  const entry = memoryRefresh.get(tokenId)
  if (!entry || entry.expiresAt <= Date.now()) {
    memoryRefresh.delete(tokenId)
    return null
  }
  return entry.userId
}

export async function revokeRefreshToken(tokenId: string) {
  if (redis) {
    try {
      await redis.del(`refresh:${tokenId}`)
    } catch {
      /* ignore */
    }
  }
  memoryRefresh.delete(tokenId)
}
