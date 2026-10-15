import { prisma } from '../lib/prisma.js'

export async function getFollowingIds(userId: string): Promise<string[]> {
  const rows = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  })
  return rows.map((r) => r.followingId)
}

export async function isBlocked(userId: string, otherId: string) {
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: userId, blockedId: otherId },
        { blockerId: otherId, blockedId: userId },
      ],
    },
  })
  return !!block
}

/** Ids of users the viewer has blocked or been blocked by. */
export async function getBlockedIds(userId: string): Promise<string[]> {
  const rows = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  })
  return rows.map((r) => (r.blockerId === userId ? r.blockedId : r.blockerId))
}
