import { NotificationType, type FollowRequest, type User } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { emitToUser } from '../socket/index.js'
import { notify } from './notifications.js'

export type FollowStatus = 'following' | 'requested' | 'none'

export const FOLLOW_REQUESTS_LINK = '/notifications/requests'

export async function isFollowing(followerId: string, followingId: string) {
  const row = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  })
  return !!row
}

/** Viewer's relationship to `targetId` as shown on the Follow button. */
export async function getFollowStatus(viewerId: string, targetId: string): Promise<FollowStatus> {
  if (await isFollowing(viewerId, targetId)) return 'following'
  const request = await prisma.followRequest.findUnique({
    where: { requesterId_targetId: { requesterId: viewerId, targetId } },
  })
  return request ? 'requested' : 'none'
}

export function pendingRequestCount(targetId: string) {
  return prisma.followRequest.count({ where: { targetId } })
}

/** Keeps the target's "Follow requests (N)" badge in sync across tabs. */
async function emitRequestCount(targetId: string) {
  emitToUser(targetId, 'follow-request:updated', { count: await pendingRequestCount(targetId) })
}

/** The "requested to follow you" notification only makes sense while the request is pending. */
function clearRequestNotification(requesterId: string, targetId: string) {
  return prisma.notification.deleteMany({
    where: { userId: targetId, actorId: requesterId, type: NotificationType.FOLLOW_REQUEST },
  })
}

/** Public accounts are followed instantly; private accounts get a pending request instead. */
export async function followOrRequest(viewer: User, target: User): Promise<FollowStatus> {
  if (await isFollowing(viewer.id, target.id)) return 'following'
  const key = { requesterId: viewer.id, targetId: target.id }

  if (!target.isPrivate) {
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: viewer.id, followingId: target.id } },
      create: { followerId: viewer.id, followingId: target.id },
      update: {},
    })
    // A request left over from when the account was private is now moot.
    await prisma.followRequest.deleteMany({ where: key })
    await notify({
      userId: target.id,
      actorId: viewer.id,
      type: NotificationType.FOLLOW,
      title: 'New follower',
      body: `${viewer.username} started following you.`,
      link: `/profile/${viewer.username}`,
    })
    return 'following'
  }

  const existing = await prisma.followRequest.findUnique({ where: { requesterId_targetId: key } })
  if (existing) return 'requested'
  await prisma.followRequest.upsert({ where: { requesterId_targetId: key }, create: key, update: {} })
  await notify({
    userId: target.id,
    actorId: viewer.id,
    type: NotificationType.FOLLOW_REQUEST,
    title: 'Follow request',
    body: `${viewer.username} requested to follow you.`,
    link: FOLLOW_REQUESTS_LINK,
  })
  await emitRequestCount(target.id)
  return 'requested'
}

/** Unfollow, or withdraw a pending request ("Requested" tapped again). */
export async function unfollowOrCancel(viewerId: string, targetId: string) {
  await prisma.follow.deleteMany({ where: { followerId: viewerId, followingId: targetId } })
  const { count } = await prisma.followRequest.deleteMany({
    where: { requesterId: viewerId, targetId },
  })
  if (count) {
    await clearRequestNotification(viewerId, targetId)
    await emitRequestCount(targetId)
  }
}

export async function acceptFollowRequest(request: FollowRequest, target: User) {
  await prisma.$transaction([
    prisma.follow.upsert({
      where: { followerId_followingId: { followerId: request.requesterId, followingId: target.id } },
      create: { followerId: request.requesterId, followingId: target.id },
      update: {},
    }),
    prisma.followRequest.deleteMany({ where: { id: request.id } }),
  ])
  await clearRequestNotification(request.requesterId, target.id)
  await notify({
    userId: request.requesterId,
    actorId: target.id,
    type: NotificationType.FOLLOW_ACCEPT,
    title: 'Follow request accepted',
    body: `${target.username} accepted your follow request.`,
    link: `/profile/${target.username}`,
  })
  emitToUser(request.requesterId, 'follow-request:accepted', { userId: target.id, username: target.username })
  await emitRequestCount(target.id)
}

export async function declineFollowRequest(request: FollowRequest) {
  await prisma.followRequest.deleteMany({ where: { id: request.id } })
  await clearRequestNotification(request.requesterId, request.targetId)
  await emitRequestCount(request.targetId)
}

/**
 * Toggle account privacy. Like Instagram, going public approves every pending
 * request, since there is nothing left to gate.
 */
export async function setAccountPrivacy(userId: string, isPrivate: boolean) {
  const user = await prisma.user.update({ where: { id: userId }, data: { isPrivate } })
  let autoAccepted = 0
  if (!isPrivate) {
    const pending = await prisma.followRequest.findMany({
      where: { targetId: userId },
      orderBy: { createdAt: 'asc' },
    })
    for (const request of pending) await acceptFollowRequest(request, user)
    autoAccepted = pending.length
  }
  return { user, autoAccepted }
}
