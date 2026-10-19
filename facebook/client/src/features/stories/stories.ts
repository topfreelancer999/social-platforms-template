import { queryOptions, type QueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import type { User } from '@/stores/authStore'

export type StoryType = 'PHOTO' | 'TEXT'
export type StoryAudience = 'FRIENDS' | 'PUBLIC'

export interface StoryItem {
  id: string
  authorId: string
  type: StoryType
  mediaUrl: string | null
  text: string | null
  background: string | null
  audience: StoryAudience
  createdAt: string
  expiresAt: string
  seen: boolean
  myReaction: string | null
  /** Only set for the viewer's own stories. */
  viewerCount: number | null
}

export interface StoryGroup {
  author: User
  stories: StoryItem[]
  isSelf: boolean
  hasUnseen: boolean
  latestAt: string | null
}

export interface StoryViewer {
  user: User
  viewedAt: string
  reaction: string | null
  replied: boolean
}

/** Shown in Messenger next to a story reply. */
export interface StoryPreview {
  id: string
  type: StoryType
  mediaUrl: string | null
  text: string | null
  background: string | null
  expired: boolean
}

export const STORY_DURATION_MS = 5000

/** Keys must match STORY_BACKGROUNDS on the server. */
export const STORY_BACKGROUNDS: Record<string, { label: string; css: string }> = {
  blue: { label: 'Facebook blue', css: 'linear-gradient(135deg, #1877f2 0%, #0a4fb4 100%)' },
  sunset: { label: 'Sunset', css: 'linear-gradient(135deg, #f9a03f 0%, #e1306c 100%)' },
  berry: { label: 'Berry', css: 'linear-gradient(135deg, #a044ff 0%, #e73c7e 100%)' },
  ocean: { label: 'Ocean', css: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)' },
  forest: { label: 'Forest', css: 'linear-gradient(135deg, #56ab2f 0%, #11683b 100%)' },
  night: { label: 'Night', css: 'linear-gradient(135deg, #232526 0%, #414345 100%)' },
}

export const backgroundCss = (key: string | null) => (STORY_BACKGROUNDS[key ?? ''] ?? STORY_BACKGROUNDS.blue).css

export const SAMPLE_PHOTOS = [1, 2, 3, 4, 5, 6].map((n) => `https://picsum.photos/seed/fb-story-sample${n}/720/1280`)

/** Facebook-style compact age: "Just now", "12m", "3h". */
export function shortAge(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h`
}

// Not refetched on focus so the tray order stays put while someone is watching stories.
export const trayQuery = (token: string | null) =>
  queryOptions({
    queryKey: ['stories', 'tray'],
    queryFn: () => api<StoryGroup[]>('/stories', { headers: authHeaders(token) }),
    refetchOnWindowFocus: false,
  })

export const userStoriesQuery = (token: string | null, userId: string) =>
  queryOptions({
    queryKey: ['stories', 'user', userId],
    queryFn: () => api<StoryGroup>(`/stories/users/${userId}`, { headers: authHeaders(token) }),
    refetchOnWindowFocus: false,
  })

/** Applies a change to every cached story group (tray list and single-user lookups). */
export function patchStoryGroups(qc: QueryClient, fn: (g: StoryGroup) => StoryGroup) {
  qc.setQueriesData<StoryGroup[] | StoryGroup>({ queryKey: ['stories'] }, (old) => {
    if (!old) return old
    return Array.isArray(old) ? old.map(fn) : fn(old)
  })
}

export const updateStory = (id: string, patch: Partial<StoryItem>) => (g: StoryGroup): StoryGroup => {
  if (!g.stories.some((s) => s.id === id)) return g
  const stories = g.stories.map((s) => (s.id === id ? { ...s, ...patch } : s))
  return { ...g, stories, hasUnseen: stories.some((s) => !s.seen) }
}

export const removeStory = (id: string) => (g: StoryGroup): StoryGroup => ({
  ...g,
  stories: g.stories.filter((s) => s.id !== id),
})
