import { seedCompanies } from './companies'
import { seedCourses } from './courses'
import { seedGroups } from './groups'
import { seedJobs } from './jobs'
import {
  seedEvents,
  seedInvitations,
  seedMessages,
  seedNotifications,
  seedSettings,
  seedThreads,
} from './misc'
import { seedComments, seedPosts } from './posts'
import { seedUsers } from './users'

export const initialSeed = {
  users: seedUsers,
  companies: seedCompanies,
  posts: seedPosts,
  comments: seedComments,
  jobs: seedJobs,
  groups: seedGroups,
  courses: seedCourses,
  invitations: seedInvitations,
  threads: seedThreads,
  messages: seedMessages,
  notifications: seedNotifications,
  events: seedEvents,
  settings: seedSettings,
  jobApplications: [] as import('@/types').JobApplication[],
  savedJobIds: {} as Record<string, string[]>,
  jobAlerts: [] as import('@/types').JobAlert[],
  courseProgress: [] as import('@/types').CourseProgress[],
  sessions: {} as Record<string, string>,
}

export type MockDatabase = typeof initialSeed
