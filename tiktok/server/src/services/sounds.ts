import type { Prisma, User } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

/** Prisma include used for every sound returned to a client, scoped to the viewer. */
export function soundInclude(viewerId: string) {
  return {
    author: true,
    favorites: { where: { userId: viewerId }, select: { id: true } },
    _count: { select: { videos: true, favorites: true } },
  } satisfies Prisma.SoundInclude
}

type SoundWithRelations = Prisma.SoundGetPayload<{ include: ReturnType<typeof soundInclude> }>

export function serializeSound(sound: SoundWithRelations) {
  return {
    id: sound.id,
    title: sound.title,
    artist: sound.artist,
    audioUrl: sound.audioUrl,
    coverUrl: sound.coverUrl,
    isOriginal: sound.isOriginal,
    createdAt: sound.createdAt,
    author: sound.author
      ? {
          id: sound.author.id,
          username: sound.author.username,
          firstName: sound.author.firstName,
          lastName: sound.author.lastName,
          avatarUrl: sound.author.avatarUrl,
          verified: sound.author.verified,
        }
      : null,
    videoCount: sound._count.videos,
    favoriteCount: sound._count.favorites,
    favorited: sound.favorites.length > 0,
  }
}

export async function findSound(soundId: string, viewerId: string) {
  const sound = await prisma.sound.findUnique({ where: { id: soundId }, include: soundInclude(viewerId) })
  return sound ? serializeSound(sound) : null
}

/** TikTok names a creator's extracted audio "original sound - <display name>". */
export function originalSoundTitle(user: Pick<User, 'firstName' | 'lastName' | 'username'>) {
  const name = `${user.firstName} ${user.lastName}`.trim() || user.username
  return `original sound - ${name}`
}

/** Create the original sound for a new upload; its audio is the uploaded video's own soundtrack. */
export function createOriginalSound(
  tx: Prisma.TransactionClient,
  author: Pick<User, 'id' | 'firstName' | 'lastName' | 'username' | 'avatarUrl'>,
  videoUrl: string,
) {
  return tx.sound.create({
    data: {
      title: originalSoundTitle(author),
      artist: author.username,
      audioUrl: videoUrl,
      coverUrl: author.avatarUrl,
      isOriginal: true,
      authorId: author.id,
    },
  })
}

export type SerializedSound = ReturnType<typeof serializeSound>
