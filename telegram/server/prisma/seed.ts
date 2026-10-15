import { GroupPrivacy, NotificationType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma.js'

const pw = await bcrypt.hash('password', 10)

async function main() {
  await prisma.report.deleteMany()
  await prisma.feedback.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.message.deleteMany()
  await prisma.threadParticipant.deleteMany()
  await prisma.thread.deleteMany()
  await prisma.groupMember.deleteMany()
  await prisma.group.deleteMany()
  await prisma.channelPost.deleteMany()
  await prisma.channelMember.deleteMany()
  await prisma.channel.deleteMany()
  await prisma.contact.deleteMany()
  await prisma.review.deleteMany()
  await prisma.userSettings.deleteMany()
  await prisma.user.deleteMany()
  await prisma.page.deleteMany()
  await prisma.event.deleteMany()

  const users = [
    { email: 'demo@telegram.local', username: 'alex_tg', displayName: 'Alex', firstName: 'Alex', lastName: 'Morgan', phone: '+1 555 0100' },
    { email: 'sarah.k@email.com', username: 'sarah_k', displayName: 'Sarah', firstName: 'Sarah', lastName: 'Kim', phone: '+1 555 0101' },
    { email: 'mike.j@email.com', username: 'mike_dev', displayName: 'Mike', firstName: 'Mike', lastName: 'Jones', phone: '+1 555 0102' },
    { email: 'emma.w@email.com', username: 'emma_art', displayName: 'Emma', firstName: 'Emma', lastName: 'Wilson', phone: '+1 555 0103' },
    { email: 'david.l@email.com', username: 'david_tech', displayName: 'David', firstName: 'David', lastName: 'Lee', phone: '+1 555 0104' },
  ]

  const created = []
  for (let i = 0; i < users.length; i++) {
    const u = users[i]
    const user = await prisma.user.create({
      data: {
        ...u,
        passwordHash: pw,
        bio: 'Available',
        isOnline: i < 2,
        avatarUrl: `https://i.pravatar.cc/150?img=${i + 1}`,
        settings: { create: {} },
      },
    })
    created.push(user)
  }

  const [alex, sarah, mike, emma, david] = created

  await prisma.contact.createMany({
    data: [
      { userId: alex.id, contactUserId: sarah.id },
      { userId: alex.id, contactUserId: mike.id },
      { userId: sarah.id, contactUserId: emma.id },
      { userId: mike.id, contactUserId: david.id },
    ],
  })

  const dmThread = await prisma.thread.create({
    data: {
      participants: { create: [{ userId: alex.id }, { userId: sarah.id }] },
      messages: {
        create: [
          { senderId: sarah.id, content: 'Hey Alex! Did you see the channel update?' },
          { senderId: alex.id, content: 'Yes — subscribing now 👍' },
          { senderId: sarah.id, content: 'Great. Let me know if you want the group invite.' },
        ],
      },
    },
  })
  void dmThread

  const groupThread = await prisma.thread.create({
    data: {
      isGroup: true,
      name: 'Dev Team Chat',
      avatarUrl: 'https://picsum.photos/seed/tggrp/200/200',
      participants: { create: created.map((u) => ({ userId: u.id })) },
      messages: {
        create: [
          { senderId: mike.id, content: 'Welcome everyone to the group!' },
          { senderId: emma.id, content: 'Thanks Mike 🎉' },
        ],
      },
    },
  })

  await prisma.group.create({
    data: {
      name: 'Dev Team Chat',
      description: 'Engineering standups and links',
      imageUrl: 'https://picsum.photos/seed/tggrp/200/200',
      privacy: GroupPrivacy.PUBLIC,
      creatorId: alex.id,
      threadId: groupThread.id,
      members: { create: created.map((u) => ({ userId: u.id, isAdmin: u.id === alex.id })) },
    },
  })

  const channels = [
    { slug: 'tech-news', name: 'Tech News Daily', desc: 'Breaking tech and startups' },
    { slug: 'crypto-updates', name: 'Crypto Updates', desc: 'Markets and blockchain' },
    { slug: 'design-inspiration', name: 'Design Inspiration', desc: 'UI/UX picks' },
  ]
  for (let i = 0; i < channels.length; i++) {
    const c = channels[i]
    await prisma.channel.create({
      data: {
        slug: c.slug,
        name: c.name,
        description: c.desc,
        imageUrl: `https://picsum.photos/seed/tgch${i}/200/200`,
        ownerId: created[i % created.length].id,
        members: { create: created.map((u) => ({ userId: u.id })) },
        posts: {
          create: [
            { content: '📢 New post: Check out today\'s highlights.', imageUrl: `https://picsum.photos/seed/tgp${i}a/600/400` },
            { content: 'Poll: What topic next week?', imageUrl: null },
            { content: 'Link drop: Useful resources thread.', imageUrl: `https://picsum.photos/seed/tgp${i}b/600/350` },
          ],
        },
      },
    })
  }

  await prisma.page.create({
    data: {
      slug: 'telegram-premium',
      name: 'Telegram Premium',
      category: 'Subscription',
      description: 'Larger uploads, faster downloads, unique badges',
      imageUrl: 'https://picsum.photos/seed/tgpage/120/120',
      coverUrl: 'https://picsum.photos/seed/tgpagec/800/200',
      reviews: { create: { userId: david.id, rating: 5, content: 'Worth it for power users.' } },
    },
  })

  await prisma.notification.create({
    data: {
      userId: alex.id,
      actorId: sarah.id,
      type: NotificationType.MESSAGE,
      title: 'New message',
      body: 'Sarah sent you a message',
      link: '/',
    },
  })

  await prisma.event.create({
    data: {
      title: 'Telegram Community Call',
      date: new Date(Date.now() + 4 * 86400000),
      location: 'Voice chat',
      imageUrl: 'https://picsum.photos/seed/tgevent/400/200',
      attendeeIds: JSON.stringify([alex.id, mike.id]),
    },
  })

  console.log('Seed complete. Demo: demo@telegram.local / password')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
