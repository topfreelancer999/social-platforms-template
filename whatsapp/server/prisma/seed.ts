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

  const dm1 = await prisma.thread.create({
    data: {
      participants: { create: [{ userId: alex.id }, { userId: sarah.id, unread: 1 }] },
      messages: {
        create: [
          { senderId: sarah.id, content: 'Hey Alex! Are we still on for lunch?', delivered: true },
          { senderId: alex.id, content: 'Yes! 12:30 at the usual place 👍', read: true },
          { senderId: sarah.id, content: 'Perfect, see you then!', delivered: true },
        ],
      },
    },
  })
  await prisma.thread.update({ where: { id: dm1.id }, data: { updatedAt: new Date() } })

  const groupThread = await prisma.thread.create({
    data: {
      isGroup: true,
      name: 'Weekend Trip',
      avatarUrl: 'https://picsum.photos/seed/wagrp/96/96',
      participants: {
        create: [alex, sarah, mike, emma].map((u) => ({
          userId: u.id,
          isAdmin: u.id === alex.id,
          unread: u.id === mike.id ? 2 : 0,
        })),
      },
      messages: {
        create: [
          { senderId: alex.id, content: 'Welcome to Weekend Trip group!' },
          { senderId: mike.id, content: 'I can drive Saturday morning' },
          { senderId: emma.id, content: 'I will bring snacks 🎉' },
        ],
      },
    },
  })
  await prisma.thread.update({ where: { id: groupThread.id }, data: { updatedAt: new Date() } })

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
