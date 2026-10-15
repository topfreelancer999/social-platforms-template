import { prisma } from '../lib/prisma.js'

export async function isFollowing(followerId: string, followingId: string) {
  const row = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  })
  return !!row
}
