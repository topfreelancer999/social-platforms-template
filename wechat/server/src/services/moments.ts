import type { Prisma, MomentsRange } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'

const DAY = 24 * 60 * 60 * 1000

/** How far back a non-self viewer may see an author's Moments (null = no limit). */
export const RANGE_MS: Record<MomentsRange, number | null> = {
  ALL: null,
  SIX_MONTHS: 182 * DAY,
  ONE_MONTH: 30 * DAY,
  THREE_DAYS: 3 * DAY,
}

export const momentInclude = {
  author: true,
  audience: { include: { tag: true, user: true } },
  likes: { include: { user: true }, orderBy: { createdAt: 'asc' } },
  comments: { include: { author: true }, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.MomentInclude

export type MomentWithRelations = Prisma.MomentGetPayload<{ include: typeof momentInclude }>

/** Everything needed to decide, without further queries, what one viewer may see. */
export interface ViewerContext {
  viewerId: string
  /** Mutual friends (both directional rows exist). */
  friendIds: Set<string>
  /** Tags (owned by anyone) that the viewer has been put in. */
  tagIds: Set<string>
  /** Authors who chose "Don't let them see my Moments" for the viewer. */
  blockedBy: Set<string>
  /** Authors whose Moments the viewer chose to hide from their feed. */
  hiddenAuthors: Set<string>
  /** Friends' Moments visibility range settings. */
  ranges: Map<string, MomentsRange>
}

export async function getFriendIds(userId: string): Promise<Set<string>> {
  const rows = await prisma.friendship.findMany({
    where: { OR: [{ userId }, { friendId: userId }] },
    select: { userId: true, friendId: true },
  })
  const outgoing = new Set(rows.filter((r) => r.userId === userId).map((r) => r.friendId))
  const incoming = new Set(rows.filter((r) => r.friendId === userId).map((r) => r.userId))
  return new Set([...outgoing].filter((id) => incoming.has(id)))
}

export async function areFriends(a: string, b: string) {
  const count = await prisma.friendship.count({
    where: { OR: [{ userId: a, friendId: b }, { userId: b, friendId: a }] },
  })
  return count === 2
}

export async function loadViewerContext(viewerId: string): Promise<ViewerContext> {
  const [rows, memberships] = await Promise.all([
    prisma.friendship.findMany({ where: { OR: [{ userId: viewerId }, { friendId: viewerId }] } }),
    prisma.contactTagMember.findMany({ where: { userId: viewerId }, select: { tagId: true } }),
  ])
  const outgoing = rows.filter((r) => r.userId === viewerId)
  const incoming = rows.filter((r) => r.friendId === viewerId)
  const incomingIds = new Set(incoming.map((r) => r.userId))
  const friendIds = new Set(outgoing.map((r) => r.friendId).filter((id) => incomingIds.has(id)))

  const settings = await prisma.userSettings.findMany({
    where: { userId: { in: [...friendIds] } },
    select: { userId: true, momentsRange: true },
  })

  return {
    viewerId,
    friendIds,
    tagIds: new Set(memberships.map((m) => m.tagId)),
    blockedBy: new Set(incoming.filter((r) => r.blockMyMoments).map((r) => r.userId)),
    hiddenAuthors: new Set(outgoing.filter((r) => r.hideTheirMoments).map((r) => r.friendId)),
    ranges: new Map(settings.map((s) => [s.userId, s.momentsRange])),
  }
}

type VisibilityInput = Pick<MomentWithRelations, 'authorId' | 'visibility' | 'createdAt'> & {
  audience: { tagId: string | null; userId: string | null }[]
}

/**
 * Server-side Moments visibility rule.
 * `inFeed` additionally applies the viewer's own "Hide their Moments" choice
 * (that choice does not hide the author's album when visited directly).
 */
export function canViewMoment(ctx: ViewerContext, m: VisibilityInput, inFeed = false): boolean {
  const { viewerId } = ctx
  if (m.authorId === viewerId) return true
  if (!ctx.friendIds.has(m.authorId)) return false
  if (ctx.blockedBy.has(m.authorId)) return false
  if (inFeed && ctx.hiddenAuthors.has(m.authorId)) return false

  const range = RANGE_MS[ctx.ranges.get(m.authorId) ?? 'ALL']
  if (range !== null && m.createdAt.getTime() < Date.now() - range) return false

  const targetsViewer = () =>
    m.audience.some((a) => a.userId === viewerId || (a.tagId !== null && ctx.tagIds.has(a.tagId)))

  switch (m.visibility) {
    case 'PUBLIC':
      return true
    case 'PRIVATE':
      return false
    case 'INCLUDE':
      return targetsViewer()
    case 'EXCLUDE':
      return !targetsViewer()
    default:
      return false
  }
}

/**
 * Shape a Moment for one viewer. Likes and comments are limited to people who are
 * friends with the viewer, plus the viewer and the author themselves; counts match.
 * Audience details are only returned to the author.
 */
export function serializeMoment(ctx: ViewerContext, m: MomentWithRelations) {
  const { viewerId } = ctx
  const isAuthor = m.authorId === viewerId
  const visibleTo = (userId: string) => userId === viewerId || userId === m.authorId || ctx.friendIds.has(userId)
  const likes = m.likes.filter((l) => visibleTo(l.userId))
  const comments = m.comments.filter((c) => visibleTo(c.authorId))
  return {
    id: m.id,
    content: m.content,
    imageUrl: m.imageUrl,
    location: m.location,
    createdAt: m.createdAt,
    author: toPublicUser(m.author),
    isAuthor,
    visibility: isAuthor ? m.visibility : null,
    audience: isAuthor
      ? {
          tags: m.audience.filter((a) => a.tag).map((a) => ({ id: a.tag!.id, name: a.tag!.name })),
          users: m.audience.filter((a) => a.user).map((a) => toPublicUser(a.user!)),
        }
      : null,
    likeCount: likes.length,
    commentCount: comments.length,
    liked: m.likes.some((l) => l.userId === viewerId),
    likes: likes.map((l) => ({ id: l.id, user: toPublicUser(l.user) })),
    comments: comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      author: toPublicUser(c.author),
    })),
  }
}

/** Load one Moment if, and only if, the viewer may see it. */
export async function findVisibleMoment(viewerId: string, momentId: string) {
  const moment = await prisma.moment.findUnique({ where: { id: momentId }, include: momentInclude })
  if (!moment) return null
  const ctx = await loadViewerContext(viewerId)
  if (!canViewMoment(ctx, moment)) return null
  return { ctx, moment }
}
