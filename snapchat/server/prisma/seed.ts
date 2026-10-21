import { DirectSnapKind, FriendshipStatus, GroupPrivacy, NotificationType, SnapType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma.js'
import { DAY_MS, sendDirectSnap } from '../src/lib/streaks.js'

const pw = await bcrypt.hash('password', 10)
const expires = new Date(Date.now() + 24 * 3600000)

async function main() {
  await prisma.report.deleteMany()
  await prisma.feedback.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.streak.deleteMany()
  await prisma.directSnap.deleteMany()
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
    { email: 'jordan.p@email.com', username: 'jordan_p', displayName: 'Jordan', firstName: 'Jordan', lastName: 'Park', snapScore: 5300 },
    { email: 'nina.r@email.com', username: 'nina_r', displayName: 'Nina', firstName: 'Nina', lastName: 'Reyes', snapScore: 7700 },
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

  const [alex, sarah, mike, emma, david, jordan, nina] = created

  const friendships: [string, string][] = [
    [alex.id, sarah.id],
    [alex.id, mike.id],
    [alex.id, emma.id],
    [sarah.id, david.id],
    [mike.id, emma.id],
    [alex.id, jordan.id],
    [nina.id, alex.id],
  ]
  for (let i = 0; i < friendships.length; i++) {
    const [a, b] = friendships[i]
    // Backdated so friendships predate the seeded Snapstreaks (the longest started ~57 days ago).
    await prisma.friendship.create({
      data: {
        senderId: a,
        receiverId: b,
        status: FriendshipStatus.ACCEPTED,
        createdAt: new Date(Date.now() - (400 - i * 30) * 86400000),
      },
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
          { senderId: sarah.id, content: 'Did you see my story?', createdAt: new Date(Date.now() - 26 * 3600000) },
          {
            senderId: alex.id,
            content: 'Yeah! That sunset snap was fire 🔥',
            createdAt: new Date(Date.now() - 25 * 3600000),
          },
        ],
      },
    },
  })

  await seedSnapstreaks({ alex, sarah, mike, emma, jordan, nina })

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

/**
 * Replays snap history through the real streak service (with an injected clock), so every
 * streak row is exactly what the rules in src/lib/streaks.ts would produce. All relative to now.
 */
async function seedSnapstreaks(u: Record<'alex' | 'sarah' | 'mike' | 'emma' | 'jordan' | 'nina', { id: string }>) {
  const now = Date.now()
  const H = 3600_000
  let n = 0
  const send = async (from: { id: string }, to: { id: string }, at: number, opened = true, text = '') => {
    n++
    const content = text
      ? { kind: DirectSnapKind.TEXT, text, color: '#a855f7' }
      : { kind: DirectSnapKind.PHOTO, imageUrl: `https://picsum.photos/seed/dsnap${n}/540/960` }
    const { snap } = await prisma.$transaction((tx) => sendDirectSnap(tx, from.id, to.id, content, new Date(at)))
    // Opened snaps have their content wiped, like the open endpoint does.
    if (opened) {
      await prisma.directSnap.update({
        where: { id: snap.id },
        data: { openedAt: new Date(at + 10 * 60_000), imageUrl: null, text: '' },
      })
    }
  }
  /** Both friends snap each other on `days` consecutive streak days starting at `anchor`. */
  const exchange = async (a: { id: string }, b: { id: string }, anchor: number, days: number) => {
    for (let k = 0; k < days; k++) {
      await send(a, b, anchor + k * DAY_MS)
      await send(b, a, anchor + k * DAY_MS + 45 * 60_000)
    }
  }

  // Sarah: 57-day streak, expires in ~20h; Alex already snapped today and Sarah opened it.
  const sarahAnchor = now + 20 * H - 58 * DAY_MS
  await exchange(u.alex, u.sarah, sarahAnchor, 57)
  await send(u.alex, u.sarah, now - 2 * H)

  // Mike: 14 days, today not done yet and ~2.5h left -> ⌛. Mike snapped, Alex opened (Received).
  const mikeAnchor = now + 2.5 * H - 15 * DAY_MS
  await exchange(u.mike, u.alex, mikeAnchor, 14)
  await send(u.mike, u.alex, now - 3 * H)

  // Emma: 2 days, below the 🔥 threshold. Alex's latest snap is still unopened (Delivered).
  const emmaAnchor = now - 30 * H
  await exchange(u.emma, u.alex, emmaAnchor, 2)
  await send(u.alex, u.emma, now - 4 * H, false)

  // Jordan: a 23-day streak that was lost 6 days ago (Jordan snapped, Alex never replied).
  const jordanAnchor = now - 30 * DAY_MS
  await exchange(u.alex, u.jordan, jordanAnchor, 23)
  await send(u.jordan, u.alex, jordanAnchor + 23 * DAY_MS + 3 * H)

  // Nina: 5-day streak with an unopened New Snap waiting for Alex.
  const ninaAnchor = now - 5 * DAY_MS - 10 * H
  await exchange(u.nina, u.alex, ninaAnchor, 5)
  await send(u.nina, u.alex, now - 20 * 60_000, false)
  await send(u.nina, u.alex, now - 5 * 60_000, false, 'Snap me back 👀')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
