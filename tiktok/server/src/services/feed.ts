import { randomBytes } from 'crypto'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getBlockedIds, getFollowingIds } from './follows.js'
import { enrichVideos, serializeVideos, videoInclude } from './videos.js'

/** Number of most recent videos considered when ranking the For You feed. */
const FOR_YOU_POOL = 500
/** Look-ahead window used to avoid showing the same creator twice in a row. */
const DIVERSITY_WINDOW = 5

export class InvalidCursorError extends Error {
  constructor() {
    super('Invalid cursor')
  }
}

function encodeCursor(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function decodeCursor<T extends z.ZodTypeAny>(schema: T, cursor: string): z.infer<T> {
  try {
    return schema.parse(JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')))
  } catch {
    throw new InvalidCursorError()
  }
}

export function newFeedSeed() {
  return randomBytes(4).toString('hex')
}

/** FNV-1a hash mapped to [0, 1) — deterministic per (seed, video). */
function hash01(input: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0) / 0x100000000
}

interface RankCandidate {
  id: string
  authorId: string
  createdAt: Date
  viewCount: number
  shareCount: number
  _count: { likes: number; comments: number; bookmarks: number }
}

/**
 * For You ranking: engagement (log-scaled) × recency decay × small per-session jitter,
 * then a diversity pass so one creator doesn't appear back to back.
 */
export function rankForYou<T extends RankCandidate>(videos: T[], anchorMs: number, seed: string): T[] {
  const scored = videos.map((v) => {
    const engagement =
      v._count.likes * 2 + v._count.comments * 3 + v._count.bookmarks * 3 + v.shareCount * 4 + v.viewCount / 200
    const ageHours = Math.max(0, (anchorMs - v.createdAt.getTime()) / 3_600_000)
    const recency = 1 / Math.pow(1 + ageHours / 24, 0.7)
    const jitter = 0.85 + 0.3 * hash01(`${seed}:${v.id}`)
    return { v, score: (1 + Math.log1p(engagement)) * recency * jitter }
  })
  scored.sort((a, b) => b.score - a.score || (a.v.id < b.v.id ? -1 : 1))
  const remaining = scored.map((s) => s.v)
  const out: T[] = []
  while (remaining.length) {
    const lastAuthor = out[out.length - 1]?.authorId
    let idx = remaining.findIndex((v, i) => i < DIVERSITY_WINDOW && v.authorId !== lastAuthor)
    if (idx === -1) idx = 0
    out.push(remaining.splice(idx, 1)[0])
  }
  return out
}

const forYouCursorSchema = z.object({
  o: z.number().int().min(0),
  a: z.number().int().positive(),
  s: z.string().regex(/^[a-z0-9]{1,16}$/i),
})

export async function getForYouFeed(
  viewerId: string,
  opts: { cursor?: string; limit: number; seed?: string },
) {
  const state = opts.cursor
    ? decodeCursor(forYouCursorSchema, opts.cursor)
    : { o: 0, a: Date.now(), s: opts.seed ?? newFeedSeed() }
  const blocked = await getBlockedIds(viewerId)
  const pool = await prisma.video.findMany({
    where: { authorId: { notIn: [viewerId, ...blocked] }, createdAt: { lte: new Date(state.a) } },
    orderBy: { createdAt: 'desc' },
    take: FOR_YOU_POOL,
    select: {
      id: true,
      authorId: true,
      createdAt: true,
      viewCount: true,
      shareCount: true,
      _count: { select: { likes: true, comments: true, bookmarks: true } },
    },
  })
  const ranked = rankForYou(pool, state.a, state.s)
  const pageIds = ranked.slice(state.o, state.o + opts.limit).map((v) => v.id)
  const items = await enrichVideos(pageIds, viewerId)
  const nextOffset = state.o + opts.limit
  return {
    items,
    seed: state.s,
    nextCursor: nextOffset < ranked.length ? encodeCursor({ o: nextOffset, a: state.a, s: state.s }) : null,
  }
}

const followingCursorSchema = z.object({
  c: z.string().datetime(),
  i: z.string().min(1).max(64),
})

export async function getFollowingFeed(viewerId: string, opts: { cursor?: string; limit: number }) {
  const after = opts.cursor ? decodeCursor(followingCursorSchema, opts.cursor) : null
  const [followingIds, blocked] = await Promise.all([getFollowingIds(viewerId), getBlockedIds(viewerId)])
  const blockedSet = new Set(blocked)
  const authorIds = followingIds.filter((id) => !blockedSet.has(id))
  if (authorIds.length === 0) {
    return { items: [], nextCursor: null, followingCount: followingIds.length }
  }
  const afterDate = after ? new Date(after.c) : null
  const rows = await prisma.video.findMany({
    where: {
      authorId: { in: authorIds },
      ...(after && afterDate
        ? { OR: [{ createdAt: { lt: afterDate } }, { createdAt: afterDate, id: { lt: after.i } }] }
        : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: opts.limit + 1,
    include: videoInclude(viewerId),
  })
  const page = rows.slice(0, opts.limit)
  const last = page[page.length - 1]
  return {
    items: await serializeVideos(page, viewerId),
    followingCount: followingIds.length,
    nextCursor:
      rows.length > opts.limit && last ? encodeCursor({ c: last.createdAt.toISOString(), i: last.id }) : null,
  }
}
