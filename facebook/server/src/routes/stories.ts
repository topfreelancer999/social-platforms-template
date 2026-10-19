import { Router } from 'express'
import { z } from 'zod'
import { ReactionType, StoryAudience, StoryType, type Story, type User } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { getFriendIds, isBlocked } from '../services/friends.js'
import { findOrCreateThread, sendDirectMessage } from '../services/messages.js'
import {
  STORY_BACKGROUNDS,
  STORY_TTL_MS,
  activeStory,
  canSeeStoriesOf,
  findVisibleStory,
} from '../services/stories.js'

export const storiesRouter = Router()
storiesRouter.use(requireAuth)

const audience = z.nativeEnum(StoryAudience).default(StoryAudience.FRIENDS)

const createSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(StoryType.TEXT),
    text: z.string().trim().min(1, 'Write something for your story').max(250, 'Text stories are limited to 250 characters'),
    background: z.enum(STORY_BACKGROUNDS, { message: 'Pick a background' }),
    audience,
  }),
  z.object({
    type: z.literal(StoryType.PHOTO),
    mediaUrl: z
      .string()
      .trim()
      .url('Enter a valid image URL')
      .refine((u) => /^https?:\/\//i.test(u), 'Image URL must start with http(s)://'),
    text: z.string().trim().max(120, 'Captions are limited to 120 characters').optional(),
    audience,
  }),
])
const reactSchema = z.object({ type: z.nativeEnum(ReactionType, { message: 'Unknown reaction' }) })
const replySchema = z.object({
  content: z.string().trim().min(1, 'Reply cannot be empty').max(1000, 'Reply is too long'),
})

type ViewRow = { storyId: string; reaction: ReactionType | null }

function toStoryDto(story: Story & { _count?: { views: number } }, viewerId: string, myViews: Map<string, ViewRow>) {
  const isOwn = story.authorId === viewerId
  const view = myViews.get(story.id)
  return {
    id: story.id,
    authorId: story.authorId,
    type: story.type,
    mediaUrl: story.mediaUrl,
    text: story.text,
    background: story.background,
    audience: story.audience,
    createdAt: story.createdAt,
    expiresAt: story.expiresAt,
    seen: isOwn || !!view,
    myReaction: view?.reaction ?? null,
    // Viewer counts are private to the author.
    viewerCount: isOwn ? (story._count?.views ?? 0) : null,
  }
}

/** Groups stories by author (oldest story first inside a group). */
async function buildGroups(stories: (Story & { author: User; _count: { views: number } })[], viewerId: string) {
  const views = await prisma.storyView.findMany({
    where: { viewerId, storyId: { in: stories.map((s) => s.id) } },
    select: { storyId: true, reaction: true },
  })
  const myViews = new Map(views.map((v) => [v.storyId, v]))
  const groups = new Map<string, { author: ReturnType<typeof toPublicUser>; stories: ReturnType<typeof toStoryDto>[] }>()
  for (const s of stories) {
    const group = groups.get(s.authorId) ?? { author: toPublicUser(s.author), stories: [] }
    group.stories.push(toStoryDto(s, viewerId, myViews))
    groups.set(s.authorId, group)
  }
  return [...groups.values()].map((g) => ({
    ...g,
    isSelf: g.author.id === viewerId,
    hasUnseen: g.stories.some((s) => !s.seen),
    latestAt: g.stories[g.stories.length - 1].createdAt,
  }))
}

// Tray: own stories first, then friends with unseen stories, then fully watched ones.
storiesRouter.get('/', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const friendIds = await getFriendIds(userId)
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
  })
  const blocked = new Set(blocks.map((b) => (b.blockerId === userId ? b.blockedId : b.blockerId)))
  const stories = await prisma.story.findMany({
    where: { authorId: { in: [userId, ...friendIds.filter((id) => !blocked.has(id))] }, ...activeStory() },
    orderBy: { createdAt: 'asc' },
    include: { author: true, _count: { select: { views: true } } },
  })
  const groups = await buildGroups(stories, userId)
  groups.sort((a, b) => {
    if (a.isSelf !== b.isSelf) return a.isSelf ? -1 : 1
    if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1
    return b.latestAt.getTime() - a.latestAt.getTime()
  })
  res.json(groups)
})

// A single person's active stories (used from profiles); public stories are visible to non-friends.
storiesRouter.get('/users/:userId', async (req: AuthRequest, res) => {
  const viewerId = req.userId!
  const author = await prisma.user.findUnique({ where: { id: param(req, 'userId') } })
  if (!author || (author.id !== viewerId && (await isBlocked(viewerId, author.id)))) {
    return res.status(404).json({ message: 'User not found' })
  }
  const friendOrSelf = await canSeeStoriesOf(viewerId, author.id, StoryAudience.FRIENDS)
  const stories = await prisma.story.findMany({
    where: {
      authorId: author.id,
      ...activeStory(),
      ...(friendOrSelf ? {} : { audience: StoryAudience.PUBLIC }),
    },
    orderBy: { createdAt: 'asc' },
    include: { author: true, _count: { select: { views: true } } },
  })
  const [group] = await buildGroups(stories, viewerId)
  res.json(group ?? { author: toPublicUser(author), stories: [], isSelf: author.id === viewerId, hasUnseen: false, latestAt: null })
})

storiesRouter.post('/', async (req: AuthRequest, res) => {
  const body = createSchema.safeParse(req.body)
  if (!body.success) return res.status(400).json({ message: body.error.issues[0]?.message ?? 'Invalid story' })
  const data = body.data
  const now = new Date()
  const story = await prisma.story.create({
    data: {
      authorId: req.userId!,
      type: data.type,
      text: data.text || null,
      mediaUrl: data.type === StoryType.PHOTO ? data.mediaUrl : null,
      background: data.type === StoryType.TEXT ? data.background : null,
      audience: data.audience,
      createdAt: now,
      expiresAt: new Date(now.getTime() + STORY_TTL_MS),
    },
  })
  res.status(201).json(toStoryDto({ ...story, _count: { views: 0 } }, req.userId!, new Map()))
})

storiesRouter.post('/:id/view', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const story = await findVisibleStory(param(req, 'id'), userId)
  if (!story) return res.status(404).json({ message: 'Story not found' })
  // Authors don't count as their own viewers.
  if (story.authorId !== userId) {
    await prisma.storyView.upsert({
      where: { storyId_viewerId: { storyId: story.id, viewerId: userId } },
      create: { storyId: story.id, viewerId: userId },
      update: {},
    })
  }
  res.status(204).end()
})

storiesRouter.post('/:id/react', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const body = reactSchema.safeParse(req.body)
  if (!body.success) return res.status(400).json({ message: body.error.issues[0]?.message ?? 'Invalid reaction' })
  const story = await findVisibleStory(param(req, 'id'), userId)
  if (!story) return res.status(404).json({ message: 'Story not found' })
  if (story.authorId === userId) return res.status(400).json({ message: "You can't react to your own story" })
  const view = await prisma.storyView.upsert({
    where: { storyId_viewerId: { storyId: story.id, viewerId: userId } },
    create: { storyId: story.id, viewerId: userId, reaction: body.data.type },
    update: { reaction: body.data.type },
  })
  res.json({ storyId: story.id, reaction: view.reaction })
})

// Replies are delivered as a Messenger DM to the author that references the story.
storiesRouter.post('/:id/reply', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const body = replySchema.safeParse(req.body)
  if (!body.success) return res.status(400).json({ message: body.error.issues[0]?.message ?? 'Invalid reply' })
  const story = await findVisibleStory(param(req, 'id'), userId)
  if (!story) return res.status(404).json({ message: 'Story not found' })
  if (story.authorId === userId) return res.status(400).json({ message: "You can't reply to your own story" })
  await prisma.storyView.upsert({
    where: { storyId_viewerId: { storyId: story.id, viewerId: userId } },
    create: { storyId: story.id, viewerId: userId },
    update: {},
  })
  const thread = await findOrCreateThread(userId, story.authorId)
  const message = await sendDirectMessage(thread.id, userId, story.authorId, body.data.content, story.id)
  res.status(201).json({ threadId: thread.id, message })
})

storiesRouter.get('/:id/viewers', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const story = await findVisibleStory(param(req, 'id'), userId)
  if (!story) return res.status(404).json({ message: 'Story not found' })
  if (story.authorId !== userId) {
    return res.status(403).json({ message: 'Only the author can see who viewed this story' })
  }
  const views = await prisma.storyView.findMany({
    where: { storyId: story.id },
    orderBy: { viewedAt: 'desc' },
    include: { viewer: true },
  })
  const replies = await prisma.message.findMany({
    where: { storyId: story.id },
    select: { senderId: true },
  })
  const repliedBy = new Set(replies.map((r) => r.senderId))
  res.json({
    count: views.length,
    reactionCount: views.filter((v) => v.reaction).length,
    viewers: views.map((v) => ({
      user: toPublicUser(v.viewer),
      viewedAt: v.viewedAt,
      reaction: v.reaction,
      replied: repliedBy.has(v.viewerId),
    })),
  })
})

storiesRouter.delete('/:id', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const story = await findVisibleStory(param(req, 'id'), userId)
  if (!story) return res.status(404).json({ message: 'Story not found' })
  if (story.authorId !== userId) return res.status(403).json({ message: 'You can only delete your own stories' })
  await prisma.story.delete({ where: { id: story.id } })
  res.status(204).end()
})
