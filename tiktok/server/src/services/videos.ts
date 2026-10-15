import type { Prisma, User } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

/** Prisma include used for every video returned to a client, scoped to the viewer. */
export function videoInclude(viewerId: string) {
  return {
    author: true,
    sound: true,
    likes: { where: { userId: viewerId }, select: { id: true } },
    bookmarks: { where: { userId: viewerId }, select: { id: true } },
    _count: { select: { likes: true, comments: true, bookmarks: true } },
  } satisfies Prisma.VideoInclude
}

type VideoWithRelations = Prisma.VideoGetPayload<{ include: ReturnType<typeof videoInclude> }>

function toVideoAuthor(u: User, following: boolean) {
  return {
    id: u.id,
    username: u.username,
    firstName: u.firstName,
    lastName: u.lastName,
    avatarUrl: u.avatarUrl,
    verified: u.verified,
    following,
  }
}

/** Shape a batch of videos for the viewer with two queries total (no N+1). */
export async function serializeVideos(videos: VideoWithRelations[], viewerId: string) {
  const authorIds = [...new Set(videos.map((v) => v.authorId))]
  const follows = authorIds.length
    ? await prisma.follow.findMany({
        where: { followerId: viewerId, followingId: { in: authorIds } },
        select: { followingId: true },
      })
    : []
  const followingSet = new Set(follows.map((f) => f.followingId))
  return videos.map((video) => ({
    id: video.id,
    videoUrl: video.videoUrl,
    coverUrl: video.coverUrl,
    caption: video.caption,
    duration: video.duration,
    viewCount: video.viewCount,
    shareCount: video.shareCount,
    createdAt: video.createdAt,
    author: toVideoAuthor(video.author, followingSet.has(video.authorId)),
    sound: video.sound
      ? { id: video.sound.id, title: video.sound.title, artist: video.sound.artist, coverUrl: video.sound.coverUrl }
      : null,
    likeCount: video._count.likes,
    commentCount: video._count.comments,
    bookmarkCount: video._count.bookmarks,
    liked: video.likes.length > 0,
    bookmarked: video.bookmarks.length > 0,
  }))
}

/** Load and serialize videos by id, preserving the order of `ids`. */
export async function enrichVideos(ids: string[], viewerId: string) {
  if (ids.length === 0) return []
  const rows = await prisma.video.findMany({
    where: { id: { in: ids } },
    include: videoInclude(viewerId),
  })
  const byId = new Map(rows.map((r) => [r.id, r]))
  const ordered = ids.map((id) => byId.get(id)).filter((v): v is VideoWithRelations => !!v)
  return serializeVideos(ordered, viewerId)
}

export async function enrichVideo(videoId: string, viewerId: string) {
  const [video] = await enrichVideos([videoId], viewerId)
  return video ?? null
}

export type SerializedVideo = Awaited<ReturnType<typeof serializeVideos>>[number]
