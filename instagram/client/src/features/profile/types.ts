export type FollowStatus = 'following' | 'requested' | 'none'

export interface ProfileUser {
  id: string
  username: string
  displayName?: string
  firstName: string
  lastName: string
  bio: string
  avatarUrl: string
  verified?: boolean
  isPrivate?: boolean
}

export interface ProfileData {
  user: ProfileUser
  isFollowing: boolean
  followStatus: FollowStatus
  /** False for a private account the viewer does not follow: grid and lists are withheld. */
  canView: boolean
  isSelf: boolean
  stats: { posts: number; followers: number; following: number }
  grid: { id: string; imageUrl: string | null; likeCount: number }[]
}

export type FollowList = 'followers' | 'following'
