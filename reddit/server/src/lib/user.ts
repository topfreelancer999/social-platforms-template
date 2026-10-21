import type { User } from '@prisma/client'

export function toPublicUser(u: User) {
  const { passwordHash: _, ...rest } = u
  // Total karma is derived so it can never drift from the post/comment split.
  return { ...rest, karma: u.postKarma + u.commentKarma }
}
