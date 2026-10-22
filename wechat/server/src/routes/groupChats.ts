import { randomBytes } from 'crypto'
import { Router, type Response } from 'express'
import { z } from 'zod'
import { ChatRole, MessageType } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { getFriendIds } from '../services/moments.js'
import {
  INVITE_TTL_MS,
  canManage,
  createMessage,
  emitGroupUpdated,
  getGroupMembership,
  groupTitle,
  memberName,
  postSystemMessage,
  userName,
} from '../services/groupChats.js'
import { emitToUsers } from '../socket/emitter.js'

export const groupChatsRouter = Router()
groupChatsRouter.use(requireAuth)

const MAX_MEMBERS = 500
const MAX_ADMINS = 3

const createSchema = z.object({
  name: z.string().trim().max(30, 'Group name is too long').optional(),
  memberIds: z.array(z.string().min(1)).min(2, 'Select at least 2 contacts').max(MAX_MEMBERS - 1),
})
const renameSchema = z.object({ name: z.string().trim().max(30, 'Group name is too long') })
const meSchema = z
  .object({ alias: z.string().trim().max(20, 'Alias is too long').optional(), muted: z.boolean().optional() })
  .refine((d) => d.alias !== undefined || d.muted !== undefined, { message: 'Nothing to update' })
const addMembersSchema = z.object({ userIds: z.array(z.string().min(1)).min(1, 'Select at least 1 contact').max(100) })
const roleSchema = z.object({ role: z.enum([ChatRole.ADMIN, ChatRole.MEMBER]) })
const transferSchema = z.object({ userId: z.string().min(1) })
const announcementSchema = z.object({
  content: z.string().trim().min(1, 'Notice cannot be empty').max(2000, 'Notice is too long'),
})

const badRequest = (res: Response, error: z.ZodError) =>
  res.status(400).json({ message: error.issues[0]?.message ?? 'Invalid input' })

/** Resolve the caller's membership or send 404/403. */
async function requireMember(req: AuthRequest, res: Response) {
  const result = await getGroupMembership(param(req, 'id'), req.userId!)
  if (!result.member) {
    res.status(result.status).json({ message: result.message })
    return null
  }
  return result.member
}

async function requireOwner(req: AuthRequest, res: Response) {
  const member = await requireMember(req, res)
  if (!member) return null
  if (member.role !== ChatRole.OWNER) {
    res.status(403).json({ message: 'Only the group owner can do this' })
    return null
  }
  return member
}

const roleOrder: Record<ChatRole, number> = { OWNER: 0, ADMIN: 1, MEMBER: 2 }

async function loadGroup(threadId: string) {
  return prisma.thread.findUniqueOrThrow({
    where: { id: threadId },
    include: { participants: { include: { user: true } } },
  })
}

type LoadedGroup = Awaited<ReturnType<typeof loadGroup>>

function serializeGroup(thread: LoadedGroup, viewerId: string) {
  const me = thread.participants.find((p) => p.userId === viewerId)!
  const members = [...thread.participants]
    .sort((a, b) => roleOrder[a.role] - roleOrder[b.role] || a.joinedAt.getTime() - b.joinedAt.getTime())
    .map((p) => ({
      ...toPublicUser(p.user),
      role: p.role,
      alias: p.alias,
      groupName: memberName(p),
      joinedAt: p.joinedAt,
    }))
  const by = thread.participants.find((p) => p.userId === thread.announcementById)
  return {
    id: thread.id,
    name: thread.name,
    title: groupTitle(thread),
    memberCount: members.length,
    announcement: thread.announcement
      ? {
          content: thread.announcement,
          updatedAt: thread.announcementAt,
          by: by ? { id: by.userId, name: memberName(by), avatarUrl: by.user.avatarUrl } : null,
        }
      : null,
    me: { role: me.role, alias: me.alias, muted: me.muted },
    members,
  }
}

/** Create a group chat from contacts. With no name the members' names are shown instead. */
groupChatsRouter.post('/', async (req: AuthRequest, res) => {
  const body = createSchema.safeParse(req.body ?? {})
  if (!body.success) return badRequest(res, body.error)
  const userId = req.userId!
  const memberIds = [...new Set(body.data.memberIds)].filter((id) => id !== userId)
  if (memberIds.length < 2) return res.status(400).json({ message: 'Select at least 2 contacts' })
  const friends = await getFriendIds(userId)
  if (!memberIds.every((id) => friends.has(id))) {
    return res.status(400).json({ message: 'Group chats can only be created with your contacts' })
  }
  const thread = await prisma.thread.create({
    data: {
      isGroup: true,
      name: body.data.name || null,
      participants: {
        create: [
          { userId, role: ChatRole.OWNER, unread: 0 },
          ...memberIds.map((id) => ({ userId: id })),
        ],
      },
    },
    include: { participants: { include: { user: true } } },
  })
  const me = thread.participants.find((p) => p.userId === userId)!
  const invited = thread.participants.filter((p) => p.userId !== userId).map((p) => userName(p.user))
  await postSystemMessage(thread.id, userId, `${userName(me.user)} invited ${invited.join(', ')} to the group chat`)
  await emitGroupUpdated(thread.id)
  res.status(201).json({ threadId: thread.id })
})

/** Messages that @mention the caller (directly or via @All), newest first. */
groupChatsRouter.get('/mentions', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const memberships = await prisma.threadParticipant.findMany({
    where: { userId, thread: { isGroup: true } },
    select: { threadId: true, lastReadAt: true },
  })
  const lastRead = new Map(memberships.map((m) => [m.threadId, m.lastReadAt]))
  const messages = await prisma.message.findMany({
    where: {
      threadId: { in: [...lastRead.keys()] },
      senderId: { not: userId },
      type: { not: MessageType.SYSTEM },
      OR: [{ mentionAll: true }, { mentions: { some: { userId } } }],
    },
    include: { sender: true, mentions: { select: { userId: true } }, thread: { include: { participants: { include: { user: true } } } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  res.json({
    items: messages.map((m) => ({
      id: m.id,
      threadId: m.threadId,
      groupTitle: groupTitle(m.thread),
      content: m.content,
      type: m.type,
      kind: m.mentions.some((x) => x.userId === userId) ? 'ME' : 'ALL',
      sender: toPublicUser(m.sender),
      createdAt: m.createdAt,
      unread: m.createdAt > (lastRead.get(m.threadId) ?? new Date(0)),
    })),
  })
})

/** Find an invite by token; 404 when unknown, 410 when older than 7 days. */
async function findInvite(token: string, res: Response) {
  const invite = await prisma.groupChatInvite.findUnique({
    where: { token },
    include: { createdBy: true, thread: { include: { participants: { include: { user: true } } } } },
  })
  if (!invite || !invite.thread.isGroup) {
    res.status(404).json({ message: 'This invite link is invalid' })
    return null
  }
  if (invite.expiresAt <= new Date()) {
    res.status(410).json({ message: 'This group QR code has expired. Ask a member for a new one.' })
    return null
  }
  return invite
}

/** Group preview shown before joining via QR code / invite link. */
groupChatsRouter.get('/invites/:token', async (req: AuthRequest, res) => {
  const invite = await findInvite(param(req, 'token'), res)
  if (!invite) return
  const { thread } = invite
  res.json({
    threadId: thread.id,
    title: groupTitle(thread),
    memberCount: thread.participants.length,
    avatars: thread.participants.slice(0, 9).map((p) => p.user.avatarUrl),
    inviter: { name: userName(invite.createdBy), avatarUrl: invite.createdBy.avatarUrl },
    expiresAt: invite.expiresAt,
    isMember: thread.participants.some((p) => p.userId === req.userId),
  })
})

groupChatsRouter.post('/invites/:token/join', async (req: AuthRequest, res) => {
  const invite = await findInvite(param(req, 'token'), res)
  if (!invite) return
  const userId = req.userId!
  const { thread } = invite
  if (thread.participants.some((p) => p.userId === userId)) {
    return res.json({ threadId: thread.id, alreadyMember: true })
  }
  if (thread.participants.length >= MAX_MEMBERS) {
    return res.status(409).json({ message: 'This group chat is full' })
  }
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  await prisma.threadParticipant.create({ data: { threadId: thread.id, userId } })
  await postSystemMessage(thread.id, userId, `${userName(user)} joined the group chat via QR code`)
  await emitGroupUpdated(thread.id)
  res.status(201).json({ threadId: thread.id, alreadyMember: false })
})

groupChatsRouter.get('/:id', async (req: AuthRequest, res) => {
  const member = await requireMember(req, res)
  if (!member) return
  res.json(serializeGroup(await loadGroup(member.threadId), req.userId!))
})

/** Rename the group (any member, as in WeChat). An empty name falls back to member names. */
groupChatsRouter.patch('/:id', async (req: AuthRequest, res) => {
  const body = renameSchema.safeParse(req.body ?? {})
  if (!body.success) return badRequest(res, body.error)
  const member = await requireMember(req, res)
  if (!member) return
  const name = body.data.name || null
  await prisma.thread.update({ where: { id: member.threadId }, data: { name } })
  const thread = await loadGroup(member.threadId)
  const me = thread.participants.find((p) => p.userId === member.userId)!
  await postSystemMessage(
    thread.id,
    member.userId,
    name ? `${memberName(me)} changed the group name to "${name}"` : `${memberName(me)} removed the group name`,
  )
  await emitGroupUpdated(thread.id)
  res.json(serializeGroup(thread, member.userId))
})

/** Caller's own settings: alias in group and mute. */
groupChatsRouter.patch('/:id/me', async (req: AuthRequest, res) => {
  const body = meSchema.safeParse(req.body ?? {})
  if (!body.success) return badRequest(res, body.error)
  const member = await requireMember(req, res)
  if (!member) return
  await prisma.threadParticipant.update({ where: { id: member.id }, data: body.data })
  if (body.data.alias !== undefined) await emitGroupUpdated(member.threadId)
  res.json(serializeGroup(await loadGroup(member.threadId), member.userId))
})

/** Add contacts to the group (any member may invite their own contacts). */
groupChatsRouter.post('/:id/members', async (req: AuthRequest, res) => {
  const body = addMembersSchema.safeParse(req.body ?? {})
  if (!body.success) return badRequest(res, body.error)
  const member = await requireMember(req, res)
  if (!member) return
  const friends = await getFriendIds(member.userId)
  const ids = [...new Set(body.data.userIds)]
  if (!ids.every((id) => friends.has(id))) {
    return res.status(400).json({ message: 'You can only add your contacts' })
  }
  const existing = await prisma.threadParticipant.findMany({ where: { threadId: member.threadId } })
  const newIds = ids.filter((id) => !existing.some((p) => p.userId === id))
  if (newIds.length === 0) return res.status(400).json({ message: 'These contacts are already in the group' })
  if (existing.length + newIds.length > MAX_MEMBERS) {
    return res.status(409).json({ message: `A group chat can have at most ${MAX_MEMBERS} members` })
  }
  await prisma.threadParticipant.createMany({ data: newIds.map((userId) => ({ threadId: member.threadId, userId })) })
  const thread = await loadGroup(member.threadId)
  const me = thread.participants.find((p) => p.userId === member.userId)!
  const added = thread.participants.filter((p) => newIds.includes(p.userId)).map((p) => userName(p.user))
  await postSystemMessage(thread.id, member.userId, `${memberName(me)} invited ${added.join(', ')} to the group chat`)
  await emitGroupUpdated(thread.id)
  res.status(201).json(serializeGroup(thread, member.userId))
})

/** Owner removes a member. */
groupChatsRouter.delete('/:id/members/:userId', async (req: AuthRequest, res) => {
  const owner = await requireOwner(req, res)
  if (!owner) return
  const targetId = param(req, 'userId')
  if (targetId === owner.userId) return res.status(400).json({ message: 'Use "Leave group" to leave the group chat' })
  const target = await prisma.threadParticipant.findUnique({
    where: { threadId_userId: { threadId: owner.threadId, userId: targetId } },
    include: { user: true },
  })
  if (!target) return res.status(404).json({ message: 'Member not found' })
  await prisma.threadParticipant.delete({ where: { id: target.id } })
  const thread = await loadGroup(owner.threadId)
  const me = thread.participants.find((p) => p.userId === owner.userId)!
  await postSystemMessage(thread.id, owner.userId, `${memberName(me)} removed ${memberName(target)} from the group chat`)
  emitToUsers([targetId], 'group:removed', { threadId: thread.id })
  await emitGroupUpdated(thread.id)
  res.json(serializeGroup(thread, owner.userId))
})

/** Owner sets or unsets a group admin (max 3, as in WeChat). */
groupChatsRouter.patch('/:id/members/:userId/role', async (req: AuthRequest, res) => {
  const body = roleSchema.safeParse(req.body ?? {})
  if (!body.success) return badRequest(res, body.error)
  const owner = await requireOwner(req, res)
  if (!owner) return
  const target = await prisma.threadParticipant.findUnique({
    where: { threadId_userId: { threadId: owner.threadId, userId: param(req, 'userId') } },
  })
  if (!target) return res.status(404).json({ message: 'Member not found' })
  if (target.role === ChatRole.OWNER) return res.status(400).json({ message: 'The owner cannot be made an admin' })
  if (body.data.role === ChatRole.ADMIN && target.role !== ChatRole.ADMIN) {
    const admins = await prisma.threadParticipant.count({ where: { threadId: owner.threadId, role: ChatRole.ADMIN } })
    if (admins >= MAX_ADMINS) return res.status(400).json({ message: `A group can have at most ${MAX_ADMINS} admins` })
  }
  await prisma.threadParticipant.update({ where: { id: target.id }, data: { role: body.data.role } })
  await emitGroupUpdated(owner.threadId)
  res.json(serializeGroup(await loadGroup(owner.threadId), owner.userId))
})

/** Owner hands ownership to another member and becomes a regular member. */
groupChatsRouter.post('/:id/transfer', async (req: AuthRequest, res) => {
  const body = transferSchema.safeParse(req.body ?? {})
  if (!body.success) return badRequest(res, body.error)
  const owner = await requireOwner(req, res)
  if (!owner) return
  if (body.data.userId === owner.userId) return res.status(400).json({ message: 'You are already the owner' })
  const target = await prisma.threadParticipant.findUnique({
    where: { threadId_userId: { threadId: owner.threadId, userId: body.data.userId } },
    include: { user: true },
  })
  if (!target) return res.status(404).json({ message: 'Member not found' })
  await prisma.$transaction([
    prisma.threadParticipant.update({ where: { id: target.id }, data: { role: ChatRole.OWNER } }),
    prisma.threadParticipant.update({ where: { id: owner.id }, data: { role: ChatRole.MEMBER } }),
  ])
  await postSystemMessage(owner.threadId, owner.userId, `${memberName(target)} is now the group owner`)
  await emitGroupUpdated(owner.threadId)
  res.json(serializeGroup(await loadGroup(owner.threadId), owner.userId))
})

/** Leave the group. A leaving owner passes ownership to an admin, else the longest-standing member. */
groupChatsRouter.post('/:id/leave', async (req: AuthRequest, res) => {
  const member = await requireMember(req, res)
  if (!member) return
  await prisma.threadParticipant.delete({ where: { id: member.id } })
  const rest = await prisma.threadParticipant.findMany({
    where: { threadId: member.threadId },
    orderBy: { joinedAt: 'asc' },
  })
  if (rest.length === 0) {
    await prisma.thread.delete({ where: { id: member.threadId } })
    return res.json({ ok: true })
  }
  if (member.role === ChatRole.OWNER) {
    const heir = rest.find((p) => p.role === ChatRole.ADMIN) ?? rest[0]
    await prisma.threadParticipant.update({ where: { id: heir.id }, data: { role: ChatRole.OWNER } })
  }
  await emitGroupUpdated(member.threadId, [member.userId])
  res.json({ ok: true })
})

/** Post or replace the Group Notice (owner/admins). Shows as a pinned @All message and notifies everyone. */
groupChatsRouter.put('/:id/announcement', async (req: AuthRequest, res) => {
  const body = announcementSchema.safeParse(req.body ?? {})
  if (!body.success) return badRequest(res, body.error)
  const member = await requireMember(req, res)
  if (!member) return
  if (!canManage(member.role)) {
    return res.status(403).json({ message: 'Only the group owner or admins can edit the Group Notice' })
  }
  await prisma.thread.update({
    where: { id: member.threadId },
    data: { announcement: body.data.content, announcementAt: new Date(), announcementById: member.userId },
  })
  const message = await createMessage({
    threadId: member.threadId,
    senderId: member.userId,
    content: body.data.content,
    type: MessageType.NOTICE,
  })
  const thread = await loadGroup(member.threadId)
  emitToUsers(
    thread.participants.map((p) => p.userId),
    'group:notice',
    { threadId: thread.id, messageId: message.id },
  )
  res.json(serializeGroup(thread, member.userId))
})

/** Clear the Group Notice (owner/admins). */
groupChatsRouter.delete('/:id/announcement', async (req: AuthRequest, res) => {
  const member = await requireMember(req, res)
  if (!member) return
  if (!canManage(member.role)) {
    return res.status(403).json({ message: 'Only the group owner or admins can edit the Group Notice' })
  }
  await prisma.thread.update({
    where: { id: member.threadId },
    data: { announcement: '', announcementAt: null, announcementById: null },
  })
  await emitGroupUpdated(member.threadId)
  res.json(serializeGroup(await loadGroup(member.threadId), member.userId))
})

/** Current group QR code / invite link for the caller, valid for 7 days. Reused while it has a day or more left. */
groupChatsRouter.post('/:id/invite', async (req: AuthRequest, res) => {
  const member = await requireMember(req, res)
  if (!member) return
  const existing = await prisma.groupChatInvite.findFirst({
    where: {
      threadId: member.threadId,
      createdById: member.userId,
      expiresAt: { gt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
  })
  const invite =
    existing ??
    (await prisma.groupChatInvite.create({
      data: {
        threadId: member.threadId,
        createdById: member.userId,
        token: randomBytes(16).toString('base64url'),
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    }))
  res.status(existing ? 200 : 201).json({ token: invite.token, expiresAt: invite.expiresAt })
})
