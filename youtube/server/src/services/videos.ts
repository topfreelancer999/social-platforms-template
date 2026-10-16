import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import { watchedFraction } from './player.js'

export async function enrichVideo(videoId: string, viewerId: string) {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: {
      author: true,
      likes: true,
      watchProgress: { where: { userId: viewerId } },
      _count: { select: { comments: true } },
    },
  })
  if (!video) return null
  const channel = video.author
  return {
    id: video.id,
    title: video.title,
    description: video.description,
    videoUrl: video.videoUrl,
    thumbnailUrl: video.thumbnailUrl,
    duration: video.duration,
    category: video.category,
    viewCount: video.viewCount,
    createdAt: video.createdAt,
    channel: {
      id: channel.id,
      username: channel.username,
      channelName: channel.channelName || `${channel.firstName} ${channel.lastName}`,
      avatarUrl: channel.avatarUrl,
      verified: channel.verified,
    },
    likeCount: video.likes.length,
    commentCount: video._count.comments,
    liked: video.likes.some((l) => l.userId === viewerId),
    progress: watchedFraction(video.watchProgress[0]),
  }
}
