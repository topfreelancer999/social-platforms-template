import { BookingStatus, type Prisma, type PrismaClient } from '@prisma/client'
import { eachNight, toDayKey } from '../lib/dates.js'
import { withLock } from '../lib/mutex.js'
import { prisma } from '../lib/prisma.js'

type Db = PrismaClient | Prisma.TransactionClient

/** Bookings in these states hold their nights; cancelled stays free them up again. */
export const HOLDING_STATUSES = [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED]

/**
 * Runs a calendar write for one listing as check-then-write in a single transaction. Calls queue
 * per listing in this process, and the first statement bumps the listing row, which takes the
 * write lock (SQLite) or a row lock (Postgres) so other server processes wait as well. Either way a
 * concurrent booking or block can't read stale availability and double-book a night.
 */
export function calendarTransaction<T>(listingId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>) {
  return withLock(`calendar:${listingId}`, () =>
    prisma.$transaction(async (tx) => {
      await tx.listing.update({ where: { id: listingId }, data: { calendarVersion: { increment: 1 } } })
      return fn(tx)
    }),
  )
}

/** Bookings and host blocks that touch any night in [start, end). */
export async function findConflicts(db: Db, listingId: string, start: Date, end: Date) {
  const [bookings, blocked] = await Promise.all([
    db.booking.findMany({
      where: {
        listingId,
        status: { in: HOLDING_STATUSES },
        checkIn: { lt: end },
        checkOut: { gt: start },
      },
      include: { guest: { select: { id: true, firstName: true, lastName: true, username: true, avatarUrl: true } } },
      orderBy: { checkIn: 'asc' },
    }),
    db.blockedNight.findMany({
      where: { listingId, date: { gte: start, lt: end } },
      orderBy: { date: 'asc' },
    }),
  ])
  return { bookings, blocked }
}

/** Sorted `YYYY-MM-DD` keys of nights in [start, end) a guest cannot book. */
export async function unavailableNights(db: Db, listingId: string, start: Date, end: Date) {
  const { bookings, blocked } = await findConflicts(db, listingId, start, end)
  const keys = new Set<string>()
  for (const b of bookings) {
    for (const night of eachNight(b.checkIn, b.checkOut)) {
      if (night >= start && night < end) keys.add(toDayKey(night))
    }
  }
  for (const n of blocked) keys.add(toDayKey(n.date))
  return [...keys].sort()
}
