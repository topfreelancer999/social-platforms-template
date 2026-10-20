import type { Prisma, User } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { isFollowing } from './follows.js'

export const PRIVATE_ACCOUNT_MESSAGE = 'This account is private'

/** Posts, reels and follower lists of a private account: owner and accepted followers only. */
export async function canViewProfileContent(viewerId: string, owner: Pick<User, 'id' | 'isPrivate'>) {
  if (!owner.isPrivate || owner.id === viewerId) return true
  return isFollowing(viewerId, owner.id)
}

/** Post filter for feeds/search/explore: public authors, the viewer, or accounts the viewer follows. */
export async function visiblePostsWhere(viewerId: string): Promise<Prisma.PostWhereInput> {
  const following = await prisma.follow.findMany({
    where: { followerId: viewerId },
    select: { followingId: true },
  })
  return {
    OR: [
      { author: { isPrivate: false } },
      { authorId: { in: [viewerId, ...following.map((f) => f.followingId)] } },
    ],
  }
}

type ViewablePost =
  | { ok: true; postId: string }
  | { ok: false; status: 403 | 404; message: string }

/** Gate for anything addressed by post id (detail, like, comment). */
export async function checkPostAccess(postId: string, viewerId: string): Promise<ViewablePost> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, author: { select: { id: true, isPrivate: true } } },
  })
  if (!post) return { ok: false, status: 404, message: 'Post not found' }
  if (!(await canViewProfileContent(viewerId, post.author))) {
    return { ok: false, status: 403, message: PRIVATE_ACCOUNT_MESSAGE }
  }
  return { ok: true, postId: post.id }
}
