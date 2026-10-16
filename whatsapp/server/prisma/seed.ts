import { GroupPrivacy, NotificationType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma.js'

const pw = await bcrypt.hash('password', 10)

async function main() {
  await prisma.report.deleteMany()
  await prisma.feedback.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.channelPost.deleteMany()
  await prisma.channelFollow.deleteMany()
  await prisma.channel.deleteMany()
  await prisma.status.deleteMany()
  await prisma.messageReceipt.deleteMany()
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
    { email: 'demo@whatsapp.local', username: 'alex-m', displayName: 'Alex Morgan', phone: '+1 555 0100', firstName: 'Alex', lastName: 'Morgan', verified: true },
    { email: 'sarah.k@email.com', username: 'sarah-k', displayName: 'Sarah Kim', phone: '+1 555 0101', firstName: 'Sarah', lastName: 'Kim' },
    { email: 'mike.j@email.com', username: 'mike-j', displayName: 'Mike Jones', phone: '+1 555 0102', firstName: 'Mike', lastName: 'Jones' },
    { email: 'emma.w@email.com', username: 'emma-w', displayName: 'Emma Wilson', phone: '+1 555 0103', firstName: 'Emma', lastName: 'Wilson' },
    { email: 'david.l@email.com', username: 'david-l', displayName: 'David Lee', phone: '+1 555 0104', firstName: 'David', lastName: 'Lee', verified: true },
  ]

  const created = []
  for (let i = 0; i < users.length; i++) {
    const u = users[i]
    const user = await prisma.user.create({
      data: {
        ...u,
        passwordHash: pw,
        avatarUrl: `https://i.pravatar.cc/150?img=${i + 1}`,
        coverUrl: `https://picsum.photos/seed/wa${i}/800/300`,
        settings: { create: {} },
      },
    })
    created.push(user)
  }

  const [alex, sarah, mike, emma, david] = created

  const ago = (minutes: number) => new Date(Date.now() - minutes * 60000)
  /** Receipt per recipient: `[deliveredMinutesAgo, readMinutesAgo]`, null = not yet. */
  type R = [number | null, number | null]
  const msg = (senderId: string, content: string, minutesAgo: number, receipts: Record<string, R>) => ({
    senderId,
    content,
    createdAt: ago(minutesAgo),
    receipts: {
      create: Object.entries(receipts).map(([userId, [d, r]]) => ({
        userId,
        deliveredAt: d === null ? null : ago(d),
        readAt: r === null ? null : ago(r),
      })),
    },
  })

  // Privacy variety: Emma turned read receipts off, David hides last seen & online.
  await prisma.userSettings.update({ where: { userId: emma.id }, data: { readReceipts: false } })
  await prisma.userSettings.update({ where: { userId: david.id }, data: { lastSeenVisible: false } })
  await prisma.user.update({ where: { id: sarah.id }, data: { lastSeen: ago(4) } })
  await prisma.user.update({ where: { id: mike.id }, data: { lastSeen: ago(26 * 60) } })
  await prisma.user.update({ where: { id: emma.id }, data: { lastSeen: ago(45) } })
  await prisma.user.update({ where: { id: david.id }, data: { lastSeen: ago(3 * 24 * 60) } })

  async function dm(other: typeof alex, alexUnread: number, messages: ReturnType<typeof msg>[]) {
    const thread = await prisma.thread.create({
      data: {
        participants: { create: [{ userId: alex.id, unread: alexUnread }, { userId: other.id }] },
        messages: { create: messages },
      },
    })
    await prisma.thread.update({ where: { id: thread.id }, data: { updatedAt: messages[messages.length - 1].createdAt } })
    return thread
  }

  // Blue ticks: Sarah read Alex's reply; her newest message is still unread for Alex.
  const dm1 = await dm(sarah, 1, [
    msg(sarah.id, 'Hey Alex! Are we still on for lunch?', 40, { [alex.id]: [39, 38] }),
    msg(alex.id, 'Yes! 12:30 at the usual place 👍', 37, { [sarah.id]: [37, 30] }),
    msg(sarah.id, 'Perfect, see you then!', 3, { [alex.id]: [3, null] }),
  ])
  // Double grey ticks: delivered to Mike's phone, not opened yet.
  await dm(mike, 0, [
    msg(mike.id, 'Did you push the release branch?', 26 * 60 + 30, { [alex.id]: [26 * 60 + 30, 26 * 60 + 20] }),
    msg(alex.id, 'Pushed it last night, CI is green ✅', 26 * 60 + 10, { [mike.id]: [26 * 60 + 9, null] }),
  ])
  // Grey double ticks even though Emma read it: she has read receipts off.
  await dm(emma, 0, [
    msg(alex.id, 'Can you send me the photos from Saturday?', 90, { [emma.id]: [89, 50] }),
  ])
  // Single tick: David's phone has been offline since the message was sent.
  await dm(david, 0, [
    msg(david.id, 'Thanks for the intro yesterday!', 3 * 24 * 60 + 20, { [alex.id]: [3 * 24 * 60 + 20, 3 * 24 * 60 + 10] }),
    msg(alex.id, 'Anytime! Let me know how the call goes', 2 * 24 * 60, { [david.id]: [null, null] }),
  ])

  const groupThread = await prisma.thread.create({
    data: {
      isGroup: true,
      name: 'Weekend Trip',
      avatarUrl: 'https://picsum.photos/seed/wagrp/96/96',
      participants: {
        create: [alex, sarah, mike, emma].map((u) => ({
          userId: u.id,
          isAdmin: u.id === alex.id,
          unread: u.id === mike.id ? 3 : 0,
        })),
      },
      messages: {
        create: [
          msg(alex.id, 'Welcome to Weekend Trip group!', 180, { [sarah.id]: [180, 170], [mike.id]: [179, 120], [emma.id]: [178, 60] }),
          msg(mike.id, 'I can drive Saturday morning', 100, { [alex.id]: [100, 95], [sarah.id]: [99, 80], [emma.id]: [99, 60] }),
          msg(emma.id, 'I will bring snacks 🎉', 55, { [alex.id]: [55, 20], [sarah.id]: [54, 30], [mike.id]: [54, null] }),
          // Group receipts ignore the privacy toggle: Message info shows Sarah and Emma read it, Mike only got it.
          msg(alex.id, 'Leaving at 8am sharp, who needs a ride?', 15, { [sarah.id]: [15, 10], [mike.id]: [14, null], [emma.id]: [15, 12] }),
        ],
      },
    },
  })
  await prisma.thread.update({ where: { id: groupThread.id }, data: { updatedAt: ago(15) } })

  const expires = new Date(Date.now() + 20 * 3600000)
  for (const u of [alex, sarah, mike]) {
    await prisma.status.create({
      data: {
        userId: u.id,
        text: u.id === alex.id ? 'Available' : 'At work',
        imageUrl: `https://picsum.photos/seed/wastatus-${u.username}/400/700`,
        expiresAt: expires,
      },
    })
  }

  const channel = await prisma.channel.create({
    data: {
      slug: 'tech-daily',
      name: 'Tech Daily',
      description: 'Daily tech news and tips',
      imageUrl: 'https://picsum.photos/seed/wach/120/120',
      ownerId: alex.id,
      followers: { create: [{ userId: mike.id }, { userId: emma.id }, { userId: sarah.id }] },
      posts: {
        create: [
          { content: 'React 19 tips you should know today', imageUrl: 'https://picsum.photos/seed/wap1/800/400' },
          { content: 'Node.js performance checklist for 2026' },
        ],
      },
    },
  })

  const community = await prisma.group.create({
    data: {
      name: 'WhatsApp Builders',
      description: 'Discuss features and APIs',
      imageUrl: 'https://picsum.photos/seed/wacomm/200/200',
      privacy: GroupPrivacy.PUBLIC,
      creatorId: alex.id,
      members: { create: created.map((u) => ({ userId: u.id })) },
    },
  })

  await prisma.page.create({
    data: {
      slug: 'business-api',
      name: 'Business API Partner',
      category: 'Partner',
      description: 'Official business tools',
      imageUrl: 'https://picsum.photos/seed/wapage/120/120',
      coverUrl: 'https://picsum.photos/seed/wapagec/800/200',
      reviews: { create: { userId: david.id, rating: 5, content: 'Reliable messaging API!' } },
    },
  })

  await prisma.notification.create({
    data: {
      userId: mike.id,
      actorId: sarah.id,
      type: NotificationType.MESSAGE,
      title: 'New message',
      body: 'Sarah: Perfect, see you then!',
      link: `/chat/${dm1.id}`,
    },
  })

  await prisma.event.create({
    data: {
      title: 'Community Call',
      date: new Date(Date.now() + 3 * 86400000),
      location: 'Group voice (demo)',
      imageUrl: 'https://picsum.photos/seed/waev/400/200',
      attendeeIds: JSON.stringify([alex.id, david.id]),
    },
  })

  console.log('Seed complete. Demo: demo@whatsapp.local / password')
  console.log(`Channel: /channels/${channel.slug}`)
  console.log(`Community group id: ${community.id}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
