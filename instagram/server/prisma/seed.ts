import { GroupPrivacy, NotificationType, PostPrivacy, PostType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma.js'

const pw = await bcrypt.hash('password', 10)

const SAMPLE_VIDEO =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'

async function main() {
  await prisma.report.deleteMany()
  await prisma.feedback.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.story.deleteMany()
  await prisma.postLike.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.post.deleteMany()
  await prisma.follow.deleteMany()
  await prisma.message.deleteMany()
  await prisma.threadParticipant.deleteMany()
  await prisma.thread.deleteMany()
  await prisma.groupMember.deleteMany()
  await prisma.group.deleteMany()
  await prisma.review.deleteMany()
  await prisma.userSettings.deleteMany()
  await prisma.user.deleteMany()
  await prisma.page.deleteMany()
  await prisma.event.deleteMany()

  const users = [
    { email: 'demo@instagram.local', username: 'alex.photo', displayName: 'Alex Morgan', firstName: 'Alex', lastName: 'Morgan', bio: 'Travel · Coffee · Code', verified: true },
    { email: 'sarah.k@email.com', username: 'sarah.k', displayName: 'Sarah Kim', firstName: 'Sarah', lastName: 'Kim', bio: 'Design daily' },
    { email: 'mike.j@email.com', username: 'mike.travels', displayName: 'Mike Jones', firstName: 'Mike', lastName: 'Jones', bio: 'Adventure' },
    { email: 'emma.w@email.com', username: 'emma.art', displayName: 'Emma Wilson', firstName: 'Emma', lastName: 'Wilson', bio: 'Artist' },
    { email: 'david.l@email.com', username: 'david.fit', displayName: 'David Lee', firstName: 'David', lastName: 'Lee', bio: 'Fitness', verified: true },
  ]

  const created = []
  for (let i = 0; i < users.length; i++) {
    const u = users[i]
    const user = await prisma.user.create({
      data: {
        ...u,
        passwordHash: pw,
        avatarUrl: `https://i.pravatar.cc/150?img=${i + 1}`,
        coverUrl: `https://picsum.photos/seed/ig${i}/800/300`,
        settings: { create: {} },
      },
    })
    created.push(user)
  }

  const [alex, sarah, mike, emma, david] = created

  for (const [a, b] of [[mike, alex], [mike, sarah], [emma, alex], [david, sarah], [alex, emma], [sarah, emma]] as const) {
    await prisma.follow.create({ data: { followerId: a.id, followingId: b.id } })
  }

  const captions = [
    'Golden hour in the city 🌅 #travel #photography',
    'New project drop — link in bio',
    'Weekend vibes with the crew',
    'Morning workout done ✅ #fitness',
    'Studio session 🎨 #art',
    'Coffee and code ☕ #devlife',
  ]

  for (let i = 0; i < 18; i++) {
    const author = created[i % created.length]
    const post = await prisma.post.create({
      data: {
        authorId: author.id,
        caption: captions[i % captions.length],
        imageUrl: `https://picsum.photos/seed/igpost${i}/1080/1080`,
        type: PostType.POST,
        createdAt: new Date(Date.now() - i * 3600000),
      },
    })
    if (i < 10) await prisma.postLike.create({ data: { postId: post.id, userId: mike.id } })
    if (i < 5) {
      await prisma.comment.create({
        data: { postId: post.id, authorId: sarah.id, content: 'Love this! 🔥' },
      })
    }
  }

  for (let i = 0; i < 4; i++) {
    await prisma.post.create({
      data: {
        authorId: created[i % created.length].id,
        caption: 'Reel moment #reels',
        videoUrl: SAMPLE_VIDEO,
        imageUrl: `https://picsum.photos/seed/reel${i}/540/960`,
        type: PostType.REEL,
      },
    })
  }

  const expires = new Date(Date.now() + 20 * 3600000)
  for (const u of [alex, sarah, mike]) {
    await prisma.story.create({
      data: {
        userId: u.id,
        imageUrl: `https://picsum.photos/seed/story-${u.username}/400/700`,
        expiresAt: expires,
      },
    })
  }

  const group = await prisma.group.create({
    data: {
      name: 'IG Creators Circle',
      description: 'Share tips and collabs',
      imageUrl: 'https://picsum.photos/seed/iggrp/200/200',
      privacy: GroupPrivacy.PUBLIC,
      creatorId: alex.id,
      members: { create: created.map((u) => ({ userId: u.id })) },
    },
  })

  await prisma.post.create({
    data: {
      authorId: alex.id,
      caption: 'Welcome to our creator group!',
      imageUrl: 'https://picsum.photos/seed/iggroup/1080/1080',
      groupId: group.id,
    },
  })

  await prisma.page.create({
    data: {
      slug: 'meta-business',
      name: 'Meta Business',
      category: 'Partner',
      description: 'Tools for creators',
      imageUrl: 'https://picsum.photos/seed/igpage/120/120',
      coverUrl: 'https://picsum.photos/seed/igpagec/800/200',
      reviews: { create: { userId: emma.id, rating: 5, content: 'Great insights for growth!' } },
    },
  })

  await prisma.thread.create({
    data: {
      participants: { create: [{ userId: alex.id }, { userId: sarah.id }] },
      messages: {
        create: [
          { senderId: sarah.id, content: 'Love your latest post!' },
          { senderId: alex.id, content: 'Thanks! Shot it at sunset.' },
        ],
      },
    },
  })

  await prisma.notification.create({
    data: {
      userId: mike.id,
      actorId: alex.id,
      type: NotificationType.FOLLOW,
      title: 'New follower',
      body: 'alex.photo started following you',
      link: '/profile/alex.photo',
    },
  })

  await prisma.event.create({
    data: {
      title: 'Creator Meetup',
      date: new Date(Date.now() + 5 * 86400000),
      location: 'Downtown Studio',
      imageUrl: 'https://picsum.photos/seed/igev/400/200',
      attendeeIds: JSON.stringify([alex.id, emma.id]),
    },
  })

  console.log('Seed complete. Demo: demo@instagram.local / password')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
