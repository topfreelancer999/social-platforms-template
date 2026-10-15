import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'

export async function enrichPost(postId: string, viewerId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      author: true,
      likes: true,
      comments: { include: { author: true }, orderBy: { createdAt: 'asc' }, take: 30 },
      _count: { select: { comments: true, likes: true } },
    },
  })
  if (!post) return null
  const liked = post.likes.some((l) => l.userId === viewerId)
  return {
    id: post.id,
    caption: post.caption,
    imageUrl: post.imageUrl,
    videoUrl: post.videoUrl,
    type: post.type,
    createdAt: post.createdAt,
    author: toPublicUser(post.author),
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    liked,
    comments: post.comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      author: toPublicUser(c.author),
    })),
  }
}
