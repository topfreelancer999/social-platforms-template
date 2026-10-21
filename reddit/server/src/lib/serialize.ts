let tail: Promise<unknown> = Promise.resolve()

/**
 * Run write transactions one at a time within this process. SQLite has a
 * single writer anyway; queueing here (instead of inside SQLite's busy
 * handler) keeps concurrent interactive transactions from tying up every
 * query-engine connection while the lock holder waits for one, which ends in
 * P1008 timeouts under bursts of votes.
 */
export function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const run = tail.then(fn, fn)
  tail = run.catch(() => undefined)
  return run
}
