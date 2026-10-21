import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { emitTo, rooms } from '../lib/realtime.js'
import { serialized } from '../lib/serialize.js'

export const voteSchema = z.object({
  value: z.union([z.literal(1), z.literal(-1), z.literal(0)], {
    errorMap: () => ({ message: 'Vote value must be 1, -1 or 0' }),
  }),
})

export type VoteValue = 1 | -1 | 0
export type VoteKind = 'post' | 'comment'

export type VoteResult = {
  kind: VoteKind
  id: string
  postId: string
  score: number
  upvotes: number
  downvotes: number
  myVote: VoteValue
}

/** How the stored tallies move when a user's vote goes from `prev` to `next`. */
function tallyDelta(prev: number, next: number) {
  return {
    score: next - prev,
    upvotes: Number(next === 1) - Number(prev === 1),
    downvotes: Number(next === -1) - Number(prev === -1),
  }
}

// Vote transactions are queued in-process (see serialized) and, as a second
// guard against other writers, start with a no-op increment on the target row:
// SQLite transactions begin deferred, so writing first takes the write lock
// before the vote row is read and deltas are never computed from stale rows.
// The same update doubles as the "does the target exist" check.
const TX_OPTIONS = { maxWait: 5000, timeout: 10000 }

/** Set (or clear with 0) the viewer's vote on a post. Returns null if the post is missing. */
export async function votePost(postId: string, userId: string, value: VoteValue): Promise<VoteResult | null> {
  const result = await serialized(() => prisma.$transaction(async (tx) => {
    const locked = await tx.post.updateMany({ where: { id: postId }, data: { score: { increment: 0 } } })
    if (locked.count === 0) return null

    const existing = await tx.postVote.findUnique({ where: { postId_userId: { postId, userId } } })
    const prev = existing?.value ?? 0
    if (prev === value) {
      const post = await tx.post.findUniqueOrThrow({ where: { id: postId } })
      return { post, delta: tallyDelta(0, 0) }
    }

    if (value === 0) await tx.postVote.delete({ where: { id: existing!.id } })
    else if (existing) await tx.postVote.update({ where: { id: existing.id }, data: { value } })
    else await tx.postVote.create({ data: { postId, userId, value } })

    const delta = tallyDelta(prev, value)
    const post = await tx.post.update({
      where: { id: postId },
      data: {
        score: { increment: delta.score },
        upvotes: { increment: delta.upvotes },
        downvotes: { increment: delta.downvotes },
      },
    })
    // Votes on your own content never count towards your karma.
    if (post.authorId !== userId) {
      await tx.user.update({ where: { id: post.authorId }, data: { postKarma: { increment: delta.score } } })
    }
    return { post, delta }
  }, TX_OPTIONS))
  if (!result) return null

  const { post, delta } = result
  const vote: VoteResult = {
    kind: 'post',
    id: post.id,
    postId: post.id,
    score: post.score,
    upvotes: post.upvotes,
    downvotes: post.downvotes,
    myVote: value,
  }
  if (delta.score !== 0) await broadcast(vote, userId, post.authorId)
  return vote
}

/** Set (or clear with 0) the viewer's vote on a comment. Returns null if the comment is missing. */
export async function voteComment(commentId: string, userId: string, value: VoteValue): Promise<VoteResult | null> {
  const result = await serialized(() => prisma.$transaction(async (tx) => {
    const locked = await tx.comment.updateMany({ where: { id: commentId }, data: { score: { increment: 0 } } })
    if (locked.count === 0) return null

    const existing = await tx.commentVote.findUnique({ where: { commentId_userId: { commentId, userId } } })
    const prev = existing?.value ?? 0
    if (prev === value) {
      const comment = await tx.comment.findUniqueOrThrow({ where: { id: commentId } })
      return { comment, delta: tallyDelta(0, 0) }
    }

    if (value === 0) await tx.commentVote.delete({ where: { id: existing!.id } })
    else if (existing) await tx.commentVote.update({ where: { id: existing.id }, data: { value } })
    else await tx.commentVote.create({ data: { commentId, userId, value } })

    const delta = tallyDelta(prev, value)
    const comment = await tx.comment.update({
      where: { id: commentId },
      data: {
        score: { increment: delta.score },
        upvotes: { increment: delta.upvotes },
        downvotes: { increment: delta.downvotes },
      },
    })
    if (comment.authorId !== userId) {
      await tx.user.update({ where: { id: comment.authorId }, data: { commentKarma: { increment: delta.score } } })
    }
    return { comment, delta }
  }, TX_OPTIONS))
  if (!result) return null

  const { comment, delta } = result
  const vote: VoteResult = {
    kind: 'comment',
    id: comment.id,
    postId: comment.postId,
    score: comment.score,
    upvotes: comment.upvotes,
    downvotes: comment.downvotes,
    myVote: value,
  }
  if (delta.score !== 0) await broadcast(vote, userId, comment.authorId)
  return vote
}

/** Live score for everyone viewing the post, live karma for the author. */
async function broadcast(vote: VoteResult, voterId: string, authorId: string) {
  const { myVote: _, ...tally } = vote
  emitTo(rooms.post(vote.postId), 'vote:updated', { ...tally, voterId })
  if (authorId === voterId) return
  const author = await prisma.user.findUnique({
    where: { id: authorId },
    select: { username: true, postKarma: true, commentKarma: true },
  })
  if (author) {
    emitTo(rooms.user(authorId), 'karma:updated', { ...author, karma: author.postKarma + author.commentKarma })
  }
}

/**
 * Rebuild every denormalized tally (post/comment score, up/down counts, user
 * karma) from the vote rows. Used by the seed; safe to run any time.
 */
export async function recountVotes() {
  await prisma.$transaction([
    prisma.$executeRawUnsafe(`UPDATE "Post" SET
      "upvotes" = (SELECT COUNT(*) FROM "PostVote" v WHERE v."postId" = "Post"."id" AND v."value" = 1),
      "downvotes" = (SELECT COUNT(*) FROM "PostVote" v WHERE v."postId" = "Post"."id" AND v."value" = -1)`),
    prisma.$executeRawUnsafe(`UPDATE "Post" SET "score" = "upvotes" - "downvotes"`),
    prisma.$executeRawUnsafe(`UPDATE "Comment" SET
      "upvotes" = (SELECT COUNT(*) FROM "CommentVote" v WHERE v."commentId" = "Comment"."id" AND v."value" = 1),
      "downvotes" = (SELECT COUNT(*) FROM "CommentVote" v WHERE v."commentId" = "Comment"."id" AND v."value" = -1)`),
    prisma.$executeRawUnsafe(`UPDATE "Comment" SET "score" = "upvotes" - "downvotes"`),
    prisma.$executeRawUnsafe(`UPDATE "User" SET
      "postKarma" = COALESCE((SELECT SUM(v."value") FROM "PostVote" v JOIN "Post" p ON p."id" = v."postId"
        WHERE p."authorId" = "User"."id" AND v."userId" <> "User"."id"), 0),
      "commentKarma" = COALESCE((SELECT SUM(v."value") FROM "CommentVote" v JOIN "Comment" c ON c."id" = v."commentId"
        WHERE c."authorId" = "User"."id" AND v."userId" <> "User"."id"), 0)`),
  ])
}
