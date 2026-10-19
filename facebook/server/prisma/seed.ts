import { FriendshipStatus, GroupPrivacy, NotificationType, PostPrivacy, ReactionType, StoryAudience, StoryType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma.js'

const pw = await bcrypt.hash('password', 10)

const users = [
  { email: 'demo@facebook.local', username: 'alex-morgan', firstName: 'Alex', lastName: 'Morgan', bio: 'Coffee enthusiast. Building cool things.', location: 'Austin, TX', workplace: 'TechStart' },
  { email: 'sarah.k@email.com', username: 'sarah-kim', firstName: 'Sarah', lastName: 'Kim', bio: 'Designer & photographer', location: 'San Francisco, CA', workplace: 'Creative Co' },
  { email: 'mike.j@email.com', username: 'mike-jones', firstName: 'Mike', lastName: 'Jones', bio: 'Sports fan', location: 'Chicago, IL', workplace: 'SalesPro' },
  { email: 'emma.w@email.com', username: 'emma-wilson', firstName: 'Emma', lastName: 'Wilson', bio: 'Mom of 2', location: 'Denver, CO', workplace: '' },
  { email: 'david.l@email.com', username: 'david-lee', firstName: 'David', lastName: 'Lee', bio: 'Developer', location: 'Seattle, WA', workplace: 'CloudNine' },
  { email: 'lisa.p@email.com', username: 'lisa-park', firstName: 'Lisa', lastName: 'Park', bio: 'Food blogger', location: 'Los Angeles, CA', workplace: '' },
  { email: 'tom.h@email.com', username: 'tom-harris', firstName: 'Tom', lastName: 'Harris', bio: 'Musician', location: 'Nashville, TN', workplace: '' },
  { email: 'nina.p@email.com', username: 'nina-patel', firstName: 'Nina', lastName: 'Patel', bio: 'Student', location: 'Boston, MA', workplace: 'MIT' },
  { email: 'chris.m@email.com', username: 'chris-martin', firstName: 'Chris', lastName: 'Martin', bio: 'Fitness coach', location: 'Miami, FL', workplace: 'FitLife' },
  { email: 'amy.k@email.com', username: 'amy-kim', firstName: 'Amy', lastName: 'Kim', bio: 'Travel addict', location: 'Portland, OR', workplace: '' },
  { email: 'james.t@email.com', username: 'james-taylor', firstName: 'James', lastName: 'Taylor', bio: 'History teacher', location: 'Philadelphia, PA', workplace: 'Lincoln High' },
  { email: 'olivia.w@email.com', username: 'olivia-white', firstName: 'Olivia', lastName: 'White', bio: 'Artist', location: 'Brooklyn, NY', workplace: '' },
  { email: 'ryan.b@email.com', username: 'ryan-brown', firstName: 'Ryan', lastName: 'Brown', bio: 'Gamer', location: 'Phoenix, AZ', workplace: '' },
  { email: 'maya.s@email.com', username: 'maya-singh', firstName: 'Maya', lastName: 'Singh', bio: 'Doctor', location: 'Houston, TX', workplace: 'City Hospital' },
  { email: 'kevin.c@email.com', username: 'kevin-chen', firstName: 'Kevin', lastName: 'Chen', bio: 'Entrepreneur', location: 'San Jose, CA', workplace: 'NextWave' },
]

async function main() {
  await prisma.report.deleteMany()
  await prisma.feedback.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.message.deleteMany()
  await prisma.storyView.deleteMany()
  await prisma.story.deleteMany()
  await prisma.threadParticipant.deleteMany()
  await prisma.thread.deleteMany()
  await prisma.review.deleteMany()
  await prisma.share.deleteMany()
  await prisma.reaction.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.post.deleteMany()
  await prisma.groupMember.deleteMany()
  await prisma.group.deleteMany()
  await prisma.block.deleteMany()
  await prisma.friendship.deleteMany()
  await prisma.userSettings.deleteMany()
  await prisma.user.deleteMany()
  await prisma.page.deleteMany()
  await prisma.event.deleteMany()

  const createdUsers = []
  for (let i = 0; i < users.length; i++) {
    const u = users[i]
    const user = await prisma.user.create({
      data: {
        ...u,
        email: u.email,
        passwordHash: pw,
        avatarUrl: `https://i.pravatar.cc/150?img=${i + 1}`,
        coverUrl: `https://picsum.photos/seed/fb${i}/1200/400`,
        settings: { create: {} },
      },
    })
    createdUsers.push(user)
  }

  const [alex, sarah, mike, emma, david] = createdUsers

  for (const [a, b] of [
    [alex.id, sarah.id],
    [alex.id, mike.id],
    [alex.id, emma.id],
    [alex.id, david.id],
    [sarah.id, emma.id],
    [mike.id, david.id],
    [createdUsers[5].id, createdUsers[12].id],
  ]) {
    await prisma.friendship.create({
      data: { senderId: a, receiverId: b, status: FriendshipStatus.ACCEPTED },
    })
  }

  await prisma.friendship.create({
    data: { senderId: createdUsers[6].id, receiverId: alex.id, status: FriendshipStatus.PENDING },
  })

  const pages = await Promise.all([
    prisma.page.create({ data: { slug: 'techstart', name: 'TechStart', category: 'Technology', description: 'Innovation for everyone', imageUrl: 'https://picsum.photos/seed/p1/100', coverUrl: 'https://picsum.photos/seed/pc1/1200/400' } }),
    prisma.page.create({ data: { slug: 'bella-cafe', name: 'Bella Cafe', category: 'Restaurant', description: 'Best coffee in town', imageUrl: 'https://picsum.photos/seed/p2/100', coverUrl: 'https://picsum.photos/seed/pc2/1200/400' } }),
    prisma.page.create({ data: { slug: 'fitlife-gym', name: 'FitLife Gym', category: 'Fitness', description: 'Transform your body', imageUrl: 'https://picsum.photos/seed/p3/100', coverUrl: 'https://picsum.photos/seed/pc3/1200/400' } }),
    prisma.page.create({ data: { slug: 'city-hospital', name: 'City Hospital', category: 'Healthcare', description: 'Care you can trust', imageUrl: 'https://picsum.photos/seed/p4/100', coverUrl: 'https://picsum.photos/seed/pc4/1200/400' } }),
    prisma.page.create({ data: { slug: 'creative-co', name: 'Creative Co', category: 'Design', description: 'Design that inspires', imageUrl: 'https://picsum.photos/seed/p5/100', coverUrl: 'https://picsum.photos/seed/pc5/1200/400' } }),
    prisma.page.create({ data: { slug: 'green-earth', name: 'Green Earth', category: 'Nonprofit', description: 'Saving the planet', imageUrl: 'https://picsum.photos/seed/p6/100', coverUrl: 'https://picsum.photos/seed/pc6/1200/400' } }),
    prisma.page.create({ data: { slug: 'book-nook', name: 'Book Nook', category: 'Retail', description: 'Your local bookstore', imageUrl: 'https://picsum.photos/seed/p7/100', coverUrl: 'https://picsum.photos/seed/pc7/1200/400' } }),
    prisma.page.create({ data: { slug: 'auto-plus', name: 'Auto Plus', category: 'Automotive', description: 'Drive happy', imageUrl: 'https://picsum.photos/seed/p8/100', coverUrl: 'https://picsum.photos/seed/pc8/1200/400' } }),
  ])

  for (let i = 0; i < 30; i++) {
    const author = createdUsers[i % createdUsers.length]
    const post = await prisma.post.create({
      data: {
        authorId: author.id,
        content: [
          'Great day today! ☀️',
          'Just launched something new — excited to share soon!',
          'Who else is watching the game tonight?',
          'Weekend vibes with friends.',
          'New recipe turned out amazing!',
          'Thoughts on remote work in 2026?',
          'Happy birthday to everyone celebrating today! 🎂',
          'Throwback to last summer.',
        ][i % 8],
        imageUrl: i % 3 === 0 ? `https://picsum.photos/seed/post${i}/600/400` : null,
        privacy: i % 5 === 0 ? PostPrivacy.PUBLIC : PostPrivacy.FRIENDS,
        createdAt: new Date(Date.now() - i * 3600000),
      },
    })
    if (i < 15) {
      await prisma.reaction.create({
        data: { postId: post.id, userId: alex.id, type: ReactionType.LIKE },
      })
      if (i % 2 === 0) {
        await prisma.comment.create({
          data: { postId: post.id, authorId: sarah.id, content: 'Love this!' },
        })
      }
    }
  }

  const group = await prisma.group.create({
    data: {
      name: 'Austin Tech Community',
      description: 'Local tech meetups and job posts',
      imageUrl: 'https://picsum.photos/seed/g1/200',
      privacy: GroupPrivacy.PUBLIC,
      creatorId: alex.id,
      members: {
        create: [{ userId: alex.id }, { userId: sarah.id }, { userId: david.id }],
      },
    },
  })
  await prisma.post.create({
    data: {
      authorId: sarah.id,
      content: 'Meetup this Saturday at 2pm!',
      groupId: group.id,
      privacy: PostPrivacy.PUBLIC,
    },
  })

  await prisma.group.create({
    data: {
      name: 'Home Cooks United',
      description: 'Share recipes and tips',
      imageUrl: 'https://picsum.photos/seed/g2/200',
      privacy: GroupPrivacy.PUBLIC,
      creatorId: createdUsers[5].id,
      members: { create: [{ userId: createdUsers[5].id }, { userId: emma.id }] },
    },
  })

  for (const page of pages.slice(0, 5)) {
    for (let r = 0; r < 3; r++) {
      await prisma.review.create({
        data: {
          pageId: page.id,
          userId: createdUsers[r + 1].id,
          rating: 4 + (r % 2),
          content: ['Great experience!', 'Highly recommend.', 'Will come back again.'][r],
        },
      })
    }
  }

  const thread = await prisma.thread.create({
    data: {
      participants: {
        create: [{ userId: alex.id, unread: 0 }, { userId: sarah.id, unread: 1 }],
      },
    },
  })
  await prisma.message.createMany({
    data: [
      { threadId: thread.id, senderId: sarah.id, content: 'Hey Alex! How are you?', createdAt: new Date(Date.now() - 3600000) },
      { threadId: thread.id, senderId: alex.id, content: 'Doing great! Want to grab coffee?', createdAt: new Date(Date.now() - 1800000) },
      { threadId: thread.id, senderId: sarah.id, content: 'Sure, Saturday works!', createdAt: new Date(Date.now() - 900000) },
    ],
  })

  await prisma.notification.createMany({
    data: [
      { userId: alex.id, actorId: sarah.id, type: NotificationType.MESSAGE, title: 'New message from Sarah', body: 'Sure, Saturday works!', link: `/messages/${thread.id}` },
      { userId: alex.id, actorId: createdUsers[6].id, type: NotificationType.FRIEND_REQUEST, title: 'Friend request', body: 'Tom Harris sent you a request', link: '/friends' },
      { userId: alex.id, actorId: mike.id, type: NotificationType.POST_REACTION, title: 'Mike reacted to your post', body: 'Reacted with Like', link: '/' },
    ],
  })

  // Stories: times are relative to now so the 24h window always holds after a reseed.
  const HOUR = 3600000
  const story = (
    authorId: string,
    hoursAgo: number,
    data: { type: StoryType; mediaUrl?: string; text?: string; background?: string; audience?: StoryAudience },
  ) =>
    prisma.story.create({
      data: {
        authorId,
        ...data,
        createdAt: new Date(Date.now() - hoursAgo * HOUR),
        expiresAt: new Date(Date.now() - hoursAgo * HOUR + 24 * HOUR),
      },
    })
  const view = (storyId: string, viewerId: string, hoursAgo: number, reaction?: ReactionType) =>
    prisma.storyView.create({
      data: { storyId, viewerId, reaction, viewedAt: new Date(Date.now() - hoursAgo * HOUR) },
    })

  const alexPhoto = await story(alex.id, 5, { type: StoryType.PHOTO, mediaUrl: 'https://picsum.photos/seed/fb-story-alex1/720/1280', text: 'Sunrise run before work 🌅' })
  const alexText = await story(alex.id, 2, { type: StoryType.TEXT, text: 'Coffee number three. Send help ☕☕☕', background: 'sunset' })
  await view(alexPhoto.id, sarah.id, 4.5, ReactionType.LOVE)
  await view(alexPhoto.id, mike.id, 4, ReactionType.LIKE)
  await view(alexPhoto.id, emma.id, 3)
  await view(alexPhoto.id, david.id, 2.5, ReactionType.HAHA)
  await view(alexText.id, sarah.id, 1.5, ReactionType.WOW)
  await view(alexText.id, david.id, 1)

  // Mike replied to Alex's photo story; the reply lives in Messenger.
  const storyThread = await prisma.thread.create({
    data: { participants: { create: [{ userId: alex.id, unread: 1 }, { userId: mike.id, unread: 0 }] } },
  })
  await prisma.message.create({
    data: { threadId: storyThread.id, senderId: mike.id, storyId: alexPhoto.id, content: 'Where is this?? Looks amazing', createdAt: new Date(Date.now() - 3.9 * HOUR) },
  })

  const sarahPhoto = await story(sarah.id, 8, { type: StoryType.PHOTO, mediaUrl: 'https://picsum.photos/seed/fb-story-sarah1/720/1280', text: 'Golden hour shoot 📸' })
  await story(sarah.id, 3, { type: StoryType.TEXT, text: 'New portfolio drops Friday!', background: 'berry' })
  await view(sarahPhoto.id, alex.id, 6, ReactionType.LOVE)
  await view(sarahPhoto.id, emma.id, 5)

  await story(mike.id, 1, { type: StoryType.PHOTO, mediaUrl: 'https://picsum.photos/seed/fb-story-mike1/720/1280', text: 'Game night 🏀' })

  // Emma's stories are already watched by Alex, so her ring is grey.
  const emmaOne = await story(emma.id, 10, { type: StoryType.PHOTO, mediaUrl: 'https://picsum.photos/seed/fb-story-emma1/720/1280' })
  const emmaTwo = await story(emma.id, 6, { type: StoryType.TEXT, text: 'Pancake Sunday with the kids 🥞', background: 'forest' })
  await view(emmaOne.id, alex.id, 9)
  await view(emmaTwo.id, alex.id, 5, ReactionType.HAHA)

  await story(david.id, 20, { type: StoryType.TEXT, text: 'Shipped it. Time to sleep.', background: 'night' })
  // Expired 2h ago: must never show up anywhere.
  await story(david.id, 26, { type: StoryType.PHOTO, mediaUrl: 'https://picsum.photos/seed/fb-story-expired/720/1280', text: 'This story has expired' })

  // Non-friends: Lisa's public story shows on her profile, Kevin's friends-only one stays hidden.
  await story(createdUsers[5].id, 4, { type: StoryType.PHOTO, mediaUrl: 'https://picsum.photos/seed/fb-story-lisa1/720/1280', text: 'Ramen tasting menu 🍜', audience: StoryAudience.PUBLIC })
  await story(createdUsers[14].id, 7, { type: StoryType.TEXT, text: 'Friends only: big news soon', background: 'ocean' })

  await prisma.event.createMany({
    data: [
      { title: 'Community BBQ', date: new Date(Date.now() + 7 * 86400000), location: 'Zilker Park, Austin', imageUrl: 'https://picsum.photos/seed/ev1/400/200', attendeeIds: [alex.id] },
      { title: 'Live Music Night', date: new Date(Date.now() + 14 * 86400000), location: 'Downtown Nashville', imageUrl: 'https://picsum.photos/seed/ev2/400/200', attendeeIds: [] },
    ],
  })

  console.log('Seed complete. Demo: demo@facebook.local / password')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
