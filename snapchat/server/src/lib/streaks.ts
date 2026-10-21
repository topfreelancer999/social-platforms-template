import type { DirectSnapKind, Prisma, Streak } from '@prisma/client'

/**
 * Snapstreak rules
 *
 * - A streak is anchored at `startedAt`, the first snap of a new exchange. Time is cut into
 *   24h "streak days": day k = [startedAt + k*24h, startedAt + (k+1)*24h).
 * - A day counts once BOTH friends have sent each other at least one snap inside that day.
 *   Chat messages never count, and a day only counts once however many snaps are exchanged.
 * - `count` = consecutive counted days 0..count-1. After day k counts, day k+1 must count
 *   too, so the streak expires at the end of day `count` (startedAt + (count+1)*24h).
 * - If day 0 or the next day is missed, the streak is lost; the next snap re-anchors a new one.
 * - 🔥 + count is shown from STREAK_VISIBLE_MIN days (Snapchat shows streaks from day 3).
 * - ⌛ shows while today's day is not yet counted and at most HOURGLASS_MS remain.
 * - 💯 is shown on day 100.
 *
 * All functions take `now`/`at` explicitly (server time by default) so they are unit-checkable.
 */
export const DAY_MS = 24 * 3600_000
export const HOURGLASS_MS = 4 * 3600_000
export const STREAK_VISIBLE_MIN = 3

export type StreakState = Pick<Streak, 'startedAt' | 'count' | 'userADay' | 'userBDay' | 'lastSnapAt'>

export interface StreakView {
  count: number
  startedAt: Date
  expiresAt: Date
  /** count >= STREAK_VISIBLE_MIN: render 🔥 + count. */
  visible: boolean
  hourglass: boolean
  milestone: string | null
}

/** Streak rows are stored once per pair with the smaller id as user A. */
export function pairOf(userId: string, otherId: string) {
  return userId < otherId ? { userAId: userId, userBId: otherId } : { userAId: otherId, userBId: userId }
}

function dayIndex(startedAt: Date, at: Date) {
  return Math.floor((at.getTime() - startedAt.getTime()) / DAY_MS)
}

function isLive(state: StreakState, now: Date) {
  const day = dayIndex(state.startedAt, now)
  // Pending (no counted day yet) lives through day 0; a streak lives through day `count`.
  return day <= state.count
}

/** Pure transition: the state after one snap from user A (`fromA`) or B at time `at`. */
export function applySnap(state: StreakState | null, fromA: boolean, at: Date): StreakState {
  let next: StreakState =
    state && isLive(state, at)
      ? { ...state }
      : { startedAt: at, count: 0, userADay: -1, userBDay: -1, lastSnapAt: at }
  const day = dayIndex(next.startedAt, at)
  if (fromA) next.userADay = day
  else next.userBDay = day
  // Days are counted in order, so the day being completed is always day `count`.
  if (next.userADay === day && next.userBDay === day && day === next.count) {
    next = { ...next, count: next.count + 1 }
  }
  next.lastSnapAt = at
  return next
}

/** What clients see; null when there is no live streak (never started, pending or lost). */
export function streakView(state: StreakState | null, now: Date = new Date()): StreakView | null {
  if (!state || state.count === 0 || !isLive(state, now)) return null
  const expiresAt = new Date(state.startedAt.getTime() + (state.count + 1) * DAY_MS)
  const todayCounted = dayIndex(state.startedAt, now) < state.count
  return {
    count: state.count,
    startedAt: state.startedAt,
    expiresAt,
    visible: state.count >= STREAK_VISIBLE_MIN,
    hourglass: !todayCounted && expiresAt.getTime() - now.getTime() <= HOURGLASS_MS,
    milestone: state.count === 100 ? '💯' : null,
  }
}

type Tx = Prisma.TransactionClient

/** Live streaks of `userId`, keyed by friend id. One query. */
export async function streaksFor(db: Tx, userId: string, now: Date = new Date()) {
  const rows = await db.streak.findMany({ where: { OR: [{ userAId: userId }, { userBId: userId }] } })
  const map = new Map<string, StreakView>()
  for (const row of rows) {
    const view = streakView(row, now)
    if (view) map.set(row.userAId === userId ? row.userBId : row.userAId, view)
  }
  return map
}

export async function streakBetween(db: Tx, userId: string, otherId: string, now: Date = new Date()) {
  const row = await db.streak.findUnique({ where: { userAId_userBId: pairOf(userId, otherId) } })
  return streakView(row, now)
}

export interface SnapContent {
  kind: DirectSnapKind
  imageUrl?: string | null
  text?: string
  color?: string | null
}

/**
 * Creates one direct snap and advances the pair's streak. Call inside a transaction so the
 * snap and the streak row never disagree. `at` is injectable (seed replays history with it).
 */
export async function sendDirectSnap(
  db: Tx,
  senderId: string,
  recipientId: string,
  content: SnapContent,
  at: Date = new Date(),
) {
  const snap = await db.directSnap.create({
    data: {
      senderId,
      recipientId,
      kind: content.kind,
      imageUrl: content.imageUrl ?? null,
      text: content.text ?? '',
      color: content.color ?? null,
      createdAt: at,
    },
  })
  const pair = pairOf(senderId, recipientId)
  const current = await db.streak.findUnique({ where: { userAId_userBId: pair } })
  const next = applySnap(current, senderId === pair.userAId, at)
  await db.streak.upsert({
    where: { userAId_userBId: pair },
    create: { ...pair, ...next },
    update: next,
  })
  return { snap, streak: streakView(next, at) }
}
