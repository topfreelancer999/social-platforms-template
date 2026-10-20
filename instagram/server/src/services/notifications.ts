import type { NotificationType } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { emitToUser } from '../socket/index.js'

export async function notify(data: {
  userId: string
  actorId: string
  type: NotificationType
  title: string
  body: string
  link?: string
}) {
  const notification = await prisma.notification.create({ data })
  emitToUser(data.userId, 'notification:new', { id: notification.id, type: notification.type })
  return notification
}
