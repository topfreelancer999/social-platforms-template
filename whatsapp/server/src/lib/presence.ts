/**
 * In-memory online tracking (socket count per user). Good enough for a single
 * API instance; a multi-instance deployment would keep these counters in Redis.
 */
const sockets = new Map<string, number>()

/** Returns true when this is the user's first open socket (they just came online). */
export function socketConnected(userId: string) {
  const n = (sockets.get(userId) ?? 0) + 1
  sockets.set(userId, n)
  return n === 1
}

/** Returns true when the user's last socket closed (they just went offline). */
export function socketDisconnected(userId: string) {
  const n = (sockets.get(userId) ?? 1) - 1
  if (n <= 0) {
    sockets.delete(userId)
    return true
  }
  sockets.set(userId, n)
  return false
}

export function isOnline(userId: string) {
  return sockets.has(userId)
}

/**
 * Privacy → "Last seen & online": a user who hides it shows neither, and (as on
 * WhatsApp) someone who hides their own last seen can't see other people's.
 */
export function presenceView(
  subject: { id: string; lastSeen: Date; settings: { lastSeenVisible: boolean } | null },
  viewerSharesLastSeen: boolean,
) {
  const visible = subject.settings?.lastSeenVisible ?? true
  return {
    online: visible && isOnline(subject.id),
    lastSeen: visible && viewerSharesLastSeen ? subject.lastSeen : null,
  }
}
