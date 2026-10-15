import { FriendshipStatus, GroupPrivacy, NotificationType, SnapType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma.js'

const pw = await bcrypt.hash('password', 10)
const expires = new Date(Date.now() + 24 * 3600000)

async function main() {
  await prisma.report.deleteMany()
  await prisma.feedback.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.snapView.deleteMany()
  await prisma.snap.deleteMany()
  await prisma.channelPost.deleteMany()
  await prisma.channelFollow.deleteMany()
  await prisma.channel.deleteMany()
  await prisma.friendship.deleteMany()
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
    { email: 'demo@snapchat.local', username: 'alex_snap', displayName: 'Alex', firstName: 'Alex', lastName: 'Morgan', snapScore: 12500 },
    { email: 'sarah.k@email.com', username: 'sarah_k', displayName: 'Sarah', firstName: 'Sarah', lastName: 'Kim', snapScore: 8200 },
    { email: 'mike.j@email.com', username: 'mike_gamer', displayName: 'Mike', firstName: 'Mike', lastName: 'Jones', snapScore: 4100 },
    { email: 'emma.w@email.com', username: 'emma_art', displayName: 'Emma', firstName: 'Emma', lastName: 'Wilson', snapScore: 9600 },
    { email: 'david.l@email.com', username: 'david_tech', displayName: 'David', firstName: 'David', lastName: 'Lee', snapScore: 22000 },
  ]

  const created = []
  for (let i = 0; i < users.length; i++) {
    const u = users[i]
    const user = await prisma.user.create({
      data: {
        ...u,
        passwordHash: pw,
        bio: 'Snapping daily · streaks on fire',
        avatarUrl: `https://i.pravatar.cc/150?img=${i + 1}`,
        bitmojiUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`,
        settings: { create: {} },
      },
    })
    created.push(user)
  }

  const [alex, sarah, mike, emma, david] = created

  const friendships: [string, string][] = [
    [alex.id, sarah.id],
    [alex.id, mike.id],
    [alex.id, emma.id],
    [sarah.id, david.id],
    [mike.id, emma.id],
  ]
  for (const [a, b] of friendships) {
    await prisma.friendship.create({
      data: { senderId: a, receiverId: b, status: FriendshipStatus.ACCEPTED },
    })
  }
  await prisma.friendship.create({
    data: { senderId: david.id, receiverId: alex.id, status: FriendshipStatus.PENDING },
  })

  const snapSeeds = ['snap1', 'snap2', 'snap3', 'snap4', 'snap5', 'snap6']
  for (let i = 0; i < snapSeeds.length; i++) {
    const author = created[i % created.length]
    await prisma.snap.create({
      data: {
        authorId: author.id,
        caption: i % 2 === 0 ? 'vibes ✨' : '',
        imageUrl: `https://picsum.photos/seed/${snapSeeds[i]}/540/960`,
        type: SnapType.STORY,
        expiresAt: expires,
      },
    })
  }
  for (let i = 0; i < 4; i++) {
    await prisma.snap.create({
      data: {
        authorId: created[i].id,
        caption: 'Spotlight moment',
        imageUrl: `https://picsum.photos/seed/spot${i}/540/960`,
        type: SnapType.SPOTLIGHT,
        expiresAt: expires,
      },
    })
  }

  const channels = [
    { slug: 'daily-news', name: 'Daily News', desc: 'Top stories in 60 seconds' },
    { slug: 'sports-highlights', name: 'Sports Highlights', desc: 'Game recaps and clips' },
    { slug: 'music-drops', name: 'Music Drops', desc: 'New releases and behind the scenes' },
  ]
  for (let i = 0; i < channels.length; i++) {
    const c = channels[i]
    const ch = await prisma.channel.create({
      data: {
        slug: c.slug,
        name: c.name,
        description: c.desc,
        imageUrl: `https://picsum.photos/seed/ch${i}/200/200`,
        ownerId: created[i % created.length].id,
        followers: { create: created.slice(0, 3).map((u) => ({ userId: u.id })) },
        posts: {
          create: [
            {
              caption: 'Latest episode is live',
              imageUrl: `https://picsum.photos/seed/chpost${i}a/540/960`,
            },
            {
              caption: 'Behind the scenes',
              imageUrl: `https://picsum.photos/seed/chpost${i}b/540/960`,
            },
          ],
        },
      },
    })
    void ch
  }

  const group = await prisma.group.create({
    data: {
      name: 'Weekend Snappers',
      description: 'Share snaps from the trip',
      imageUrl: 'https://picsum.photos/seed/scgrp/200/200',
      privacy: GroupPrivacy.PUBLIC,
      creatorId: alex.id,
      members: { create: created.map((u) => ({ userId: u.id })) },
    },
  })

  await prisma.page.create({
    data: {
      slug: 'snap-plus',
      name: 'Snapchat+',
      category: 'Subscription',
      description: 'Exclusive badges and story rewatch',
      imageUrl: 'https://picsum.photos/seed/scpage/120/120',
      coverUrl: 'https://picsum.photos/seed/scpagec/800/200',
      reviews: { create: { userId: david.id, rating: 5, content: 'Rewatch and custom app icons are worth it.' } },
    },
  })

  await prisma.thread.create({
    data: {
      participants: { create: [{ userId: alex.id }, { userId: sarah.id }] },
      messages: {
        create: [
          { senderId: sarah.id, content: 'Did you see my story?' },
          { senderId: alex.id, content: 'Yeah! That sunset snap was fire 🔥' },
        ],
      },
    },
  })

  await prisma.notification.create({
    data: {
      userId: alex.id,
      actorId: sarah.id,
      type: NotificationType.STORY,
      title: 'New Story',
      body: 'Sarah posted a new Story',
      link: '/',
    },
  })

  await prisma.event.create({
    data: {
      title: 'Snap Map Meetup',
      date: new Date(Date.now() + 3 * 86400000),
      location: 'Central Park',
      imageUrl: 'https://picsum.photos/seed/scevent/400/200',
      attendeeIds: JSON.stringify([alex.id, emma.id, mike.id]),
    },
  })

  console.log('Seed complete. Demo: demo@snapchat.local / password')
  console.log(`Group: ${group.name}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
