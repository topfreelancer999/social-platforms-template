export type FeedTab = 'for-you' | 'following'

export interface VideoAuthor {
  id: string
  username: string
  firstName: string
  lastName?: string
  avatarUrl: string
  verified?: boolean
  /** Whether the viewer follows this creator. */
  following?: boolean
}

export interface VideoItem {
  id: string
  videoUrl: string
  coverUrl: string
  caption: string
  duration?: number
  viewCount?: number
  shareCount?: number
  bookmarkCount?: number
  createdAt?: string
  author: VideoAuthor
  sound?: { id: string; title: string; artist: string; coverUrl?: string; isOriginal?: boolean } | null
  likeCount: number
  commentCount: number
  liked: boolean
  bookmarked?: boolean
}

export interface VideoFeedPage {
  items: VideoItem[]
  nextCursor: string | null
  /** For You only: ranking seed so later pages keep the same order. */
  seed?: string
  /** Following only: how many creators the viewer follows. */
  followingCount?: number
}
