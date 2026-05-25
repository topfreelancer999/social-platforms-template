import type {
  Event,
  Invitation,
  Message,
  Notification,
  Settings,
  Thread,
} from '@/types'

const ago = (hours: number) =>
  new Date(Date.now() - hours * 3600000).toISOString()
const agoDays = (days: number) =>
  new Date(Date.now() - days * 86400000).toISOString()

export const seedInvitations: Invitation[] = [
  {
    id: 'inv1',
    fromUserId: 'u7',
    toUserId: 'u1',
    message: 'Hi Jane, I\'d love to connect!',
    createdAt: ago(12),
  },
  {
    id: 'inv2',
    fromUserId: 'u9',
    toUserId: 'u1',
    createdAt: ago(24),
  },
  {
    id: 'inv3',
    fromUserId: 'u10',
    toUserId: 'u1',
    message: 'Fellow PM enthusiast here!',
    createdAt: ago(36),
  },
  {
    id: 'inv4',
    fromUserId: 'u1',
    toUserId: 'u8',
    createdAt: ago(48),
  },
]

export const seedThreads: Thread[] = [
  {
    id: 't1',
    participantIds: ['u1', 'u2'],
    lastMessageAt: ago(1),
    unreadBy: { u1: 0, u2: 0 },
  },
  {
    id: 't2',
    participantIds: ['u1', 'u3'],
    lastMessageAt: ago(5),
    unreadBy: { u1: 1, u3: 0 },
  },
  {
    id: 't3',
    participantIds: ['u1', 'u7'],
    lastMessageAt: ago(10),
    unreadBy: { u1: 2, u7: 0 },
  },
  {
    id: 't4',
    participantIds: ['u1', 'u4'],
    lastMessageAt: agoDays(2),
    unreadBy: { u1: 0, u4: 0 },
  },
  {
    id: 't5',
    participantIds: ['u2', 'u6'],
    lastMessageAt: agoDays(3),
    unreadBy: { u2: 0, u6: 1 },
  },
]

export const seedMessages: Message[] = [
  {
    id: 'm1',
    threadId: 't1',
    senderId: 'u2',
    content: 'Hey Jane, great post about product lessons!',
    createdAt: ago(3),
    read: true,
  },
  {
    id: 'm2',
    threadId: 't1',
    senderId: 'u1',
    content: 'Thanks John! Would love to sync on the migration too.',
    createdAt: ago(2),
    read: true,
  },
  {
    id: 'm3',
    threadId: 't1',
    senderId: 'u2',
    content: 'Absolutely — how about Thursday?',
    createdAt: ago(1),
    read: true,
  },
  {
    id: 'm4',
    threadId: 't2',
    senderId: 'u3',
    content: 'Loved your feedback on the design system!',
    createdAt: ago(5),
    read: false,
  },
  {
    id: 'm5',
    threadId: 't3',
    senderId: 'u7',
    content: 'I have some great PM roles that might interest you.',
    createdAt: ago(12),
    read: false,
  },
  {
    id: 'm6',
    threadId: 't3',
    senderId: 'u7',
    content: 'Let me know if you\'d like an intro!',
    createdAt: ago(10),
    read: false,
  },
  {
    id: 'm7',
    threadId: 't4',
    senderId: 'u4',
    content: 'Thanks for connecting!',
    createdAt: agoDays(2),
    read: true,
  },
]

export const seedNotifications: Notification[] = [
  {
    id: 'n1',
    userId: 'u1',
    type: 'post_reaction',
    title: 'John Smith reacted to your post',
    body: 'Reacted with Insightful',
    link: '/',
    read: false,
    createdAt: ago(1),
    actorId: 'u2',
  },
  {
    id: 'n2',
    userId: 'u1',
    type: 'connection_accepted',
    title: 'Mike Johnson accepted your invitation',
    body: 'You are now connected',
    link: '/mynetwork',
    read: false,
    createdAt: ago(3),
    actorId: 'u4',
  },
  {
    id: 'n3',
    userId: 'u1',
    type: 'profile_view',
    title: 'Lisa Park viewed your profile',
    body: 'Recruiter at Tech Talent',
    link: '/in/lisa-park',
    read: false,
    createdAt: ago(6),
    actorId: 'u7',
  },
  {
    id: 'n4',
    userId: 'u1',
    type: 'job_alert',
    title: 'New jobs matching "Product Manager"',
    body: '3 new jobs in San Francisco',
    link: '/jobs',
    read: true,
    createdAt: ago(12),
  },
  {
    id: 'n5',
    userId: 'u1',
    type: 'group_invite',
    title: 'Sarah Chen invited you to UX Design Community',
    body: 'Join the group to see posts',
    link: '/groups/g3',
    read: true,
    createdAt: ago(24),
    actorId: 'u3',
  },
  {
    id: 'n6',
    userId: 'u1',
    type: 'message',
    title: 'New message from Lisa Park',
    body: 'I have some great PM roles...',
    link: '/messaging/t3',
    read: false,
    createdAt: ago(10),
    actorId: 'u7',
  },
  {
    id: 'n7',
    userId: 'u1',
    type: 'post_reaction',
    title: 'Emma Wilson reacted to your post',
    body: 'Reacted with Like',
    read: true,
    createdAt: agoDays(2),
    actorId: 'u5',
  },
]

export const seedEvents: Event[] = [
  {
    id: 'ev1',
    title: 'ProductCon 2026',
    date: new Date(Date.now() + 14 * 86400000).toISOString(),
    location: 'San Francisco, CA',
    imageUrl: 'https://picsum.photos/seed/event1/400/200',
    attendeeIds: ['u1', 'u4'],
  },
  {
    id: 'ev2',
    title: 'React Summit',
    date: new Date(Date.now() + 30 * 86400000).toISOString(),
    location: 'Online',
    imageUrl: 'https://picsum.photos/seed/event2/400/200',
    attendeeIds: ['u2'],
  },
  {
    id: 'ev3',
    title: 'Women in Tech Networking',
    date: new Date(Date.now() + 7 * 86400000).toISOString(),
    location: 'New York, NY',
    imageUrl: 'https://picsum.photos/seed/event3/400/200',
    attendeeIds: ['u3', 'u1'],
  },
  {
    id: 'ev4',
    title: 'Startup Pitch Night',
    date: new Date(Date.now() + 21 * 86400000).toISOString(),
    location: 'Boston, MA',
    imageUrl: 'https://picsum.photos/seed/event4/400/200',
    attendeeIds: ['u8'],
  },
]

import { seedUsers } from './users'

export const seedSettings: Settings[] = seedUsers.map((u) => ({
  userId: u.id,
  emailNotifications: true,
  pushNotifications: true,
  profileVisibility: 'public' as const,
  activityVisibility: true,
  messagingFrom: 'connections' as const,
  language: 'en',
  theme: 'light' as const,
}))
