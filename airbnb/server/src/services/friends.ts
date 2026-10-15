import { FriendshipStatus } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

export async function getFriendIds(userId: string): Promise<string[]> {
  const friendships = await prisma.friendship.findMany({
    where: {
      status: FriendshipStatus.ACCEPTED,
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
  })
  return friendships.map((f) => (f.senderId === userId ? f.receiverId : f.senderId))
}

export async function areFriends(userId: string, otherId: string) {
  const ids = await getFriendIds(userId)
  return ids.includes(otherId)
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
