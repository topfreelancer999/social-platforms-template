import type { Pin, User } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'

export type EnrichedPin = {
  id: string
  title: string
  description: string
  imageUrl: string
  linkUrl: string | null
  createdAt: Date
  author: ReturnType<typeof toPublicUser>
  board?: { id: string; name: string } | null
  saveCount: number
  commentCount: number
  savedByMe: boolean
}

export async function enrichPin(pin: Pin & { author: User }, userId?: string): Promise<EnrichedPin> {
  const [saveCount, commentCount, board, saved] = await Promise.all([
    prisma.pinSave.count({ where: { pinId: pin.id } }),
    prisma.pinComment.count({ where: { pinId: pin.id } }),
    pin.boardId ? prisma.board.findUnique({ where: { id: pin.boardId }, select: { id: true, name: true } }) : null,
    userId
      ? prisma.pinSave.findFirst({ where: { pinId: pin.id, userId } }).then(Boolean)
      : Promise.resolve(false),
  ])
  return {
    id: pin.id,
    title: pin.title,
    description: pin.description,
    imageUrl: pin.imageUrl,
    linkUrl: pin.linkUrl,
    createdAt: pin.createdAt,
    author: toPublicUser(pin.author),
    board,
    saveCount,
    commentCount,
    savedByMe: saved,
  }
}
