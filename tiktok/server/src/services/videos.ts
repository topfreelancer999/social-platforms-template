import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'

export async function enrichVideo(videoId: string, viewerId: string) {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: {
      author: true,
      sound: true,
      likes: true,
      _count: { select: { comments: true } },
    },
  })
  if (!video) return null
  return {
    id: video.id,
    videoUrl: video.videoUrl,
    coverUrl: video.coverUrl,
    caption: video.caption,
    duration: video.duration,
    viewCount: video.viewCount,
    createdAt: video.createdAt,
    author: toPublicUser(video.author),
    sound: video.sound
      ? { id: video.sound.id, title: video.sound.title, artist: video.sound.artist }
      : null,
    likeCount: video.likes.length,
    commentCount: video._count.comments,
    liked: video.likes.some((l) => l.userId === viewerId),
  }
}
