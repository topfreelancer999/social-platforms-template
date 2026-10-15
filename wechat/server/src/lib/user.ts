import type { User } from '@prisma/client'

export function toPublicUser(u: User) {
  const { passwordHash: _, ...rest } = u
  return rest
}
