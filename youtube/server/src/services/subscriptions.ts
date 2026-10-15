import { prisma } from '../lib/prisma.js'

export async function getSubscribedChannelIds(userId: string): Promise<string[]> {
  const rows = await prisma.subscription.findMany({
    where: { subscriberId: userId },
    select: { channelId: true },
  })
  return rows.map((r) => r.channelId)
}

export async function isSubscribed(subscriberId: string, channelId: string) {
  const row = await prisma.subscription.findUnique({
    where: { subscriberId_channelId: { subscriberId, channelId } },
  })
  return !!row
}

export async function isBlocked(userId: string, otherId: string) {
  return false
}
