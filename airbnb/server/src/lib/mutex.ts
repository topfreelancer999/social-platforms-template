const tails = new Map<string, Promise<void>>()

/**
 * Runs `fn` after every earlier call with the same key has settled. SQLite has a single writer and
 * Prisma's interactive transactions time out instead of queueing when several of them fight for
 * that lock, so calendar writes for one listing take turns in-process before opening theirs.
 */
export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = tails.get(key) ?? Promise.resolve()
  const run = previous.then(fn)
  const tail = run.then(
    () => undefined,
    () => undefined,
  )
  tails.set(key, tail)
  try {
    return await run
  } finally {
    if (tails.get(key) === tail) tails.delete(key)
  }
}
