import { prisma } from '../lib/prisma.js'

/** Finds the 1:1 thread between two users, creating it if they have never talked. */
export async function findOrCreateThread(userId: string, otherId: string) {
  const existing = await prisma.thread.findFirst({
    where: {
      participants: { every: { userId: { in: [userId, otherId] } } },
      AND: [
        { participants: { some: { userId } } },
        { participants: { some: { userId: otherId } } },
      ],
    },
  })
  if (existing) return existing
  return prisma.thread.create({
    data: { participants: { create: [{ userId }, { userId: otherId, unread: 0 }] } },
  })
}

/** Appends a message to a thread, bumps the thread and the recipient's unread counter. */
export async function sendDirectMessage(
  threadId: string,
  senderId: string,
  toUserId: string,
  content: string,
  storyId?: string,
) {
  const msg = await prisma.message.create({
    data: { threadId, senderId, content, storyId },
  })
  await prisma.thread.update({ where: { id: threadId }, data: { updatedAt: new Date() } })
  await prisma.threadParticipant.update({
    where: { threadId_userId: { threadId, userId: toUserId } },
    data: { unread: { increment: 1 } },
  })
  return msg
}
