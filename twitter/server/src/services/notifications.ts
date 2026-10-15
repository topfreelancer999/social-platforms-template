import type { NotificationType } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

interface NotifyInput {
  userId: string
  actorId: string
  type: NotificationType
  title: string
  body?: string
  link?: string
}

/** Creates a notification unless the actor is acting on their own content. */
export async function notify({ userId, actorId, type, title, body = '', link }: NotifyInput) {
  if (userId === actorId) return
  await prisma.notification.create({
    data: { userId, actorId, type, title, body, link: link ?? null },
  })
}

/** Removes a notification previously created for an action that was undone. */
export async function retractNotification({ userId, actorId, type, link }: Omit<NotifyInput, 'title' | 'body'>) {
  await prisma.notification.deleteMany({ where: { userId, actorId, type, link: link ?? null } })
}

export function snippet(text: string, max = 80) {
  const t = text.trim()
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}
