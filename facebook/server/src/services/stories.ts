import type { Story } from '@prisma/client'
import { StoryAudience } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { areFriends, isBlocked } from './friends.js'

export const STORY_TTL_MS = 24 * 60 * 60 * 1000

/** Gradient keys accepted for text stories; the client maps them to CSS. */
export const STORY_BACKGROUNDS = ['blue', 'sunset', 'berry', 'ocean', 'forest', 'night'] as const

/** Prisma filter for stories that have not expired yet. */
export const activeStory = () => ({ expiresAt: { gt: new Date() } })

export function toStoryPreview(story: Story) {
  return {
    id: story.id,
    type: story.type,
    mediaUrl: story.mediaUrl,
    text: story.text,
    background: story.background,
    expired: story.expiresAt <= new Date(),
  }
}

/** Whether `viewerId` may see stories of `authorId` with the given audience. */
export async function canSeeStoriesOf(viewerId: string, authorId: string, audience: StoryAudience) {
  if (viewerId === authorId) return true
  if (await isBlocked(viewerId, authorId)) return false
  if (audience === StoryAudience.PUBLIC) return true
  return areFriends(viewerId, authorId)
}

/** Active story the viewer is allowed to see, or null (callers answer 404 so ids don't leak). */
export async function findVisibleStory(storyId: string, viewerId: string) {
  const story = await prisma.story.findFirst({ where: { id: storyId, ...activeStory() } })
  if (!story) return null
  return (await canSeeStoriesOf(viewerId, story.authorId, story.audience)) ? story : null
}
