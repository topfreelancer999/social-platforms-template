import type { REACTION_TYPES } from '@/lib/constants'

export type ReactionType = (typeof REACTION_TYPES)[number]
export type PostVisibility = 'anyone' | 'connections'
export type ConnectionStatus = 'connected' | 'pending_sent' | 'pending_received' | 'none'
export type NotificationType =
  | 'connection_accepted'
  | 'post_reaction'
  | 'job_alert'
  | 'profile_view'
  | 'group_invite'
  | 'message'
export type SearchTab = 'all' | 'people' | 'jobs' | 'companies' | 'posts' | 'groups'

export interface Experience {
  id: string
  title: string
  company: string
  location?: string
  startDate: string
  endDate?: string
  current?: boolean
  description?: string
}

export interface Education {
  id: string
  school: string
  degree: string
  field?: string
  startDate: string
  endDate?: string
}

export interface Skill {
  id: string
  name: string
  endorsements: number
}

export interface User {
  id: string
  email: string
  password: string
  username: string
  firstName: string
  lastName: string
  headline: string
  location: string
  avatarUrl: string
  coverUrl: string
  about: string
  connectionIds: string[]
  followerIds: string[]
  followingIds: string[]
  experience: Experience[]
  education: Education[]
  skills: Skill[]
  featuredUrl?: string
  isPremium?: boolean
  companyId?: string
}

export interface UserPublic extends Omit<User, 'email' | 'password'> {}

export interface Comment {
  id: string
  postId: string
  authorId: string
  content: string
  createdAt: string
}

export interface PostReaction {
  userId: string
  type: ReactionType
}

export interface Post {
  id: string
  authorId: string
  content: string
  imageUrl?: string
  articleUrl?: string
  articleTitle?: string
  visibility: PostVisibility
  createdAt: string
  reactions: PostReaction[]
  commentIds: string[]
  repostOfId?: string
  companyId?: string
  groupId?: string
  isSponsored?: boolean
}

export interface Job {
  id: string
  title: string
  companyId: string
  location: string
  remote: boolean
  experienceLevel: string
  employmentType: string
  description: string
  qualifications: string[]
  salary?: string
  applicants: number
  postedAt: string
  promoted?: boolean
}

export interface JobApplication {
  id: string
  jobId: string
  userId: string
  resumeName: string
  appliedAt: string
}

export interface Company {
  id: string
  slug: string
  name: string
  tagline: string
  industry: string
  size: string
  headquarters: string
  about: string
  logoUrl: string
  bannerUrl: string
  specialties: string[]
  followerIds: string[]
  employeeIds: string[]
}

export interface Group {
  id: string
  name: string
  description: string
  memberIds: string[]
  imageUrl: string
  privacy: 'public' | 'private'
}

export interface Lesson {
  id: string
  title: string
  durationMinutes: number
}

export interface Course {
  id: string
  title: string
  description: string
  instructor: string
  thumbnailUrl: string
  durationHours: number
  lessons: Lesson[]
  category: string
}

export interface CourseProgress {
  courseId: string
  userId: string
  completedLessonIds: string[]
  percent: number
}

export interface Invitation {
  id: string
  fromUserId: string
  toUserId: string
  message?: string
  createdAt: string
}

export interface Thread {
  id: string
  participantIds: string[]
  lastMessageAt: string
  unreadBy: Record<string, number>
}

export interface Message {
  id: string
  threadId: string
  senderId: string
  content: string
  createdAt: string
  read: boolean
}

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  link?: string
  read: boolean
  createdAt: string
  actorId?: string
}

export interface Event {
  id: string
  title: string
  date: string
  location: string
  imageUrl: string
  attendeeIds: string[]
}

export interface JobAlert {
  id: string
  userId: string
  query: string
  location: string
  createdAt: string
}

export interface Settings {
  userId: string
  emailNotifications: boolean
  pushNotifications: boolean
  profileVisibility: 'public' | 'connections' | 'private'
  activityVisibility: boolean
  messagingFrom: 'connections' | 'everyone'
  language: string
  theme: 'light' | 'dark'
}

export interface AuthResponse {
  token: string
  user: UserPublic
}

export interface Paginated<T> {
  items: T[]
  page: number
  total: number
  hasMore: boolean
}

export interface FeedFilter {
  filter: 'following' | 'network' | 'recent'
}

export interface SearchParams {
  q: string
  type: SearchTab
  location?: string
  remote?: boolean
  industry?: string
}
