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
  await prisma.followRequest.deleteMany()
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
    // Demo is a private account so it has follow requests to review.
    { email: 'demo@instagram.local', username: 'alex.photo', displayName: 'Alex Morgan', firstName: 'Alex', lastName: 'Morgan', bio: 'Travel · Coffee · Code', verified: true, isPrivate: true },
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

  // Private accounts and follow requests
  const privateUsers = [
    { email: 'nina.p@email.com', username: 'nina.private', displayName: 'Nina Patel', firstName: 'Nina', lastName: 'Patel', bio: 'Film photography 📷 close friends only', isPrivate: true },
    { email: 'leo.m@email.com', username: 'leo.film', displayName: 'Leo Martins', firstName: 'Leo', lastName: 'Martins', bio: 'Super 8 · city nights', isPrivate: true },
    { email: 'maya.r@email.com', username: 'maya.studio', displayName: 'Maya Rossi', firstName: 'Maya', lastName: 'Rossi', bio: 'Ceramics studio journal', isPrivate: true },
    { email: 'olivia.c@email.com', username: 'olivia.cooks', displayName: 'Olivia Chen', firstName: 'Olivia', lastName: 'Chen', bio: 'Home cooking, every day 🍜' },
  ]
  const extra = []
  for (let i = 0; i < privateUsers.length; i++) {
    extra.push(
      await prisma.user.create({
        data: {
          ...privateUsers[i],
          passwordHash: pw,
          avatarUrl: `https://i.pravatar.cc/150?img=${i + 20}`,
          coverUrl: `https://picsum.photos/seed/igp${i}/800/300`,
          settings: { create: {} },
        },
      }),
    )
  }
  const [nina, leo, maya, olivia] = extra

  const privateCaptions = ['Darkroom day #film', 'Contact sheet favourites', 'Late train home']
  for (const u of extra) {
    for (let i = 0; i < 3; i++) {
      await prisma.post.create({
        data: {
          authorId: u.id,
          caption: `${privateCaptions[i]} — ${u.displayName}`,
          imageUrl: `https://picsum.photos/seed/${u.username}${i}/1080/1080`,
          type: PostType.POST,
          createdAt: new Date(Date.now() - (i * 5 + 2) * 3600000),
        },
      })
    }
  }

  // nina: private, demo does not follow (locked profile). leo: private, demo follows (visible).
  // maya: private, demo has a pending outgoing request ("Requested").
  for (const [a, b] of [[emma, nina], [alex, leo], [sarah, leo], [olivia, maya]] as const) {
    await prisma.follow.create({ data: { followerId: a.id, followingId: b.id } })
  }
  await prisma.story.create({
    data: { userId: leo.id, imageUrl: 'https://picsum.photos/seed/story-leo.film/400/700', expiresAt: expires },
  })
  await prisma.story.create({
    data: { userId: nina.id, imageUrl: 'https://picsum.photos/seed/story-nina.private/400/700', expiresAt: expires },
  })

  const requests = [
    { requester: sarah, target: alex, minutesAgo: 12 },
    { requester: david, target: alex, minutesAgo: 95 },
    { requester: olivia, target: alex, minutesAgo: 60 * 26 },
    { requester: alex, target: maya, minutesAgo: 60 * 5 },
  ]
  for (const { requester, target, minutesAgo } of requests) {
    const createdAt = new Date(Date.now() - minutesAgo * 60000)
    await prisma.followRequest.create({ data: { requesterId: requester.id, targetId: target.id, createdAt } })
    await prisma.notification.create({
      data: {
        userId: target.id,
        actorId: requester.id,
        type: NotificationType.FOLLOW_REQUEST,
        title: 'Follow request',
        body: `${requester.username} requested to follow you.`,
        link: '/notifications/requests',
        createdAt,
      },
    })
  }
  await prisma.notification.create({
    data: {
      userId: alex.id,
      actorId: leo.id,
      type: NotificationType.FOLLOW_ACCEPT,
      title: 'Follow request accepted',
      body: 'leo.film accepted your follow request.',
      link: '/profile/leo.film',
      createdAt: new Date(Date.now() - 3 * 86400000),
    },
  })
  await prisma.notification.create({
    data: {
      userId: alex.id,
      actorId: emma.id,
      type: NotificationType.POST_LIKE,
      title: 'New like',
      body: 'emma.art liked your post.',
      link: '/profile/alex.photo',
      read: true,
      createdAt: new Date(Date.now() - 2 * 86400000),
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
