import type { VideoItem } from '@/features/feed/types'

export interface SoundAuthor {
  id: string
  username: string
  firstName: string
  lastName: string
  avatarUrl: string
  verified?: boolean
}

export interface Sound {
  id: string
  title: string
  artist: string
  audioUrl: string
  coverUrl: string
  isOriginal: boolean
  createdAt: string
  author: SoundAuthor | null
  videoCount: number
  favoriteCount: number
  favorited: boolean
}

export interface SoundDetail extends Sound {
  /** The creator's first video for an original sound (badged "Original"). */
  originalVideoId: string | null
}

export type SoundSort = 'popular' | 'recent'

export interface SoundVideosPage {
  items: VideoItem[]
  nextCursor: string | null
}

/** What TikTok shows next to the music note: "original sound - Name" or "Title - Artist". */
export function soundLabel(sound: { title: string; artist: string; isOriginal?: boolean }) {
  return sound.isOriginal ? sound.title : `${sound.title} - ${sound.artist}`
}

/** Deep link into the upload flow with a sound preselected. */
export function uploadWithSoundHref(soundId: string) {
  return `/upload?sound=${encodeURIComponent(soundId)}`
}
