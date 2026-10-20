import { Router } from 'express'
import { NotificationType } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import {
  acceptFollowRequest,
  declineFollowRequest,
  followOrRequest,
  getFollowStatus,
  unfollowOrCancel,
} from '../services/follows.js'

export const followsRouter = Router()
followsRouter.use(requireAuth)

const idParam = z.string().cuid()

/** Parses an id route param, replying 400 when it is malformed. */
function parseId(req: AuthRequest, res: import('express').Response, name: string, label: string) {
  const parsed = idParam.safeParse(param(req, name))
  if (!parsed.success) {
    res.status(400).json({ message: `Invalid ${label} id` })
    return null
  }
  return parsed.data
}

followsRouter.get('/following', async (req: AuthRequest, res) => {
  const rows = await prisma.follow.findMany({
    where: { followerId: req.userId! },
    include: { following: true },
  })
  res.json({ users: rows.map((r) => toPublicUser(r.following)) })
})

/** Incoming pending requests for the signed-in user, newest first. Opening the inbox marks them seen. */
followsRouter.get('/requests', async (req: AuthRequest, res) => {
  const rows = await prisma.followRequest.findMany({
    where: { targetId: req.userId! },
    include: { requester: true },
    orderBy: { createdAt: 'desc' },
  })
  await prisma.notification.updateMany({
    where: { userId: req.userId!, type: NotificationType.FOLLOW_REQUEST, read: false },
    data: { read: true },
  })
  res.json({
    count: rows.length,
    requests: rows.map((r) => ({ id: r.id, createdAt: r.createdAt, user: toPublicUser(r.requester) })),
  })
})

/** Only the account that received the request may settle it. */
async function findOwnRequest(req: AuthRequest, res: import('express').Response) {
  const id = parseId(req, res, 'requestId', 'request')
  if (!id) return null
  const request = await prisma.followRequest.findFirst({ where: { id, targetId: req.userId! } })
  if (!request) {
    res.status(404).json({ message: 'Follow request not found' })
    return null
  }
  return request
}

followsRouter.post('/requests/:requestId/accept', async (req: AuthRequest, res) => {
  const request = await findOwnRequest(req, res)
  if (!request) return
  const me = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } })
  await acceptFollowRequest(request, me)
  res.json({ ok: true })
})

followsRouter.delete('/requests/:requestId', async (req: AuthRequest, res) => {
  const request = await findOwnRequest(req, res)
  if (!request) return
  await declineFollowRequest(request)
  res.json({ ok: true })
})

/** Owner removes someone from their followers (they are not notified). */
followsRouter.delete('/followers/:userId', async (req: AuthRequest, res) => {
  const followerId = parseId(req, res, 'userId', 'user')
  if (!followerId) return
  const { count } = await prisma.follow.deleteMany({
    where: { followerId, followingId: req.userId! },
  })
  if (!count) return res.status(404).json({ message: 'This person does not follow you' })
  res.json({ ok: true })
})

followsRouter.post('/:userId', async (req: AuthRequest, res) => {
  const targetId = parseId(req, res, 'userId', 'user')
  if (!targetId) return
  if (targetId === req.userId) return res.status(400).json({ message: 'Cannot follow yourself' })
  const [viewer, target] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: req.userId! } }),
    prisma.user.findUnique({ where: { id: targetId } }),
  ])
  if (!target) return res.status(404).json({ message: 'User not found' })
  const status = await followOrRequest(viewer, target)
  res.json({ status, following: status === 'following' })
})

/** Unfollow, or cancel a pending request. */
followsRouter.delete('/:userId', async (req: AuthRequest, res) => {
  const targetId = parseId(req, res, 'userId', 'user')
  if (!targetId) return
  await unfollowOrCancel(req.userId!, targetId)
  res.json({ status: 'none', following: false })
})

followsRouter.get('/:userId/status', async (req: AuthRequest, res) => {
  const targetId = parseId(req, res, 'userId', 'user')
  if (!targetId) return
  const status = await getFollowStatus(req.userId!, targetId)
  res.json({ status, following: status === 'following' })
})
