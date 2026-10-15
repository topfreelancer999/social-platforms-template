import { GroupPrivacy, NotificationType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma.js'

const pw = await bcrypt.hash('password', 10)

async function main() {
  await prisma.report.deleteMany()
  await prisma.feedback.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.momentComment.deleteMany()
  await prisma.momentLike.deleteMany()
  await prisma.moment.deleteMany()
  await prisma.channelPost.deleteMany()
  await prisma.channelFollow.deleteMany()
  await prisma.channel.deleteMany()
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
    { email: 'demo@wechat.local', username: 'alex-wx', wechatId: 'wx_alex2024', displayName: 'Alex Morgan', phone: '+86 138 0000 1000', firstName: 'Alex', lastName: 'Morgan', verified: true },
    { email: 'sarah.k@email.com', username: 'sarah-wx', wechatId: 'wx_sarahk', displayName: 'Sarah Kim', phone: '+86 138 0000 1001', firstName: 'Sarah', lastName: 'Kim' },
    { email: 'mike.j@email.com', username: 'mike-wx', wechatId: 'wx_mikej', displayName: 'Mike Jones', phone: '+86 138 0000 1002', firstName: 'Mike', lastName: 'Jones' },
    { email: 'emma.w@email.com', username: 'emma-wx', wechatId: 'wx_emmaw', displayName: 'Emma Wilson', phone: '+86 138 0000 1003', firstName: 'Emma', lastName: 'Wilson' },
    { email: 'david.l@email.com', username: 'david-wx', wechatId: 'wx_davidl', displayName: 'David Lee', phone: '+86 138 0000 1004', firstName: 'David', lastName: 'Lee', verified: true },
  ]

  const created = []
  for (let i = 0; i < users.length; i++) {
    const u = users[i]
    const user = await prisma.user.create({
      data: {
        ...u,
        passwordHash: pw,
        avatarUrl: `https://i.pravatar.cc/150?img=${i + 1}`,
        coverUrl: `https://picsum.photos/seed/wx${i}/800/300`,
        settings: { create: {} },
      },
    })
    created.push(user)
  }

  const [alex, sarah, mike, emma, david] = created

  const dm = await prisma.thread.create({
    data: {
      participants: { create: [{ userId: alex.id }, { userId: sarah.id, unread: 1 }] },
      messages: {
        create: [
          { senderId: sarah.id, content: 'Alex, did you see the Moments post?' },
          { senderId: alex.id, content: 'Yes! Nice photo from Shanghai 🏙️', read: true },
        ],
      },
    },
  })
  await prisma.thread.update({ where: { id: dm.id }, data: { updatedAt: new Date() } })

  await prisma.thread.create({
    data: {
      isGroup: true,
      name: 'Project Team',
      avatarUrl: 'https://picsum.photos/seed/wxteam/96/96',
      participants: {
        create: [alex, sarah, mike, emma].map((u) => ({
          userId: u.id,
          isAdmin: u.id === alex.id,
          unread: u.id === mike.id ? 1 : 0,
        })),
      },
      messages: {
        create: [
          { senderId: alex.id, content: 'Team sync at 3pm today' },
          { senderId: mike.id, content: 'Got it 👌' },
        ],
      },
    },
  })

  const captions = [
    'Beautiful day in the city 🌤️',
    'Lunch with friends #food',
    'Weekend hiking trip ⛰️',
    'New gadget unboxing 📱',
  ]
  for (let i = 0; i < 8; i++) {
    const author = created[i % created.length]
    const moment = await prisma.moment.create({
      data: {
        authorId: author.id,
        content: captions[i % captions.length],
        imageUrl: `https://picsum.photos/seed/wxmoment${i}/800/600`,
        location: i % 2 === 0 ? 'Shanghai' : '',
        createdAt: new Date(Date.now() - i * 7200000),
      },
    })
    if (i < 4) await prisma.momentLike.create({ data: { momentId: moment.id, userId: mike.id } })
    if (i < 2) {
      await prisma.momentComment.create({
        data: { momentId: moment.id, authorId: sarah.id, content: 'So good!' },
      })
    }
  }

  const channel = await prisma.channel.create({
    data: {
      slug: 'tech-weekly',
      name: 'Tech Weekly',
      description: 'Official account — tech news & tips',
      imageUrl: 'https://picsum.photos/seed/wxoa/120/120',
      ownerId: alex.id,
      verified: true,
      followers: { create: created.map((u) => ({ userId: u.id })) },
      posts: {
        create: [
          { content: 'WeChat Clone v1 is live — try Moments & Channels!', imageUrl: 'https://picsum.photos/seed/wxpost1/800/400' },
          { content: 'Tip: Use group chats for team collaboration' },
        ],
      },
    },
  })

  const group = await prisma.group.create({
    data: {
      name: 'WeChat Developers',
      description: 'Build mini programs & APIs together',
      imageUrl: 'https://picsum.photos/seed/wxgrp/200/200',
      privacy: GroupPrivacy.PUBLIC,
      creatorId: alex.id,
      members: { create: created.map((u) => ({ userId: u.id })) },
    },
  })

  await prisma.page.create({
    data: {
      slug: 'wechat-pay-partner',
      name: 'WeChat Pay Partner',
      category: 'Partner',
      description: 'Payments integration',
      imageUrl: 'https://picsum.photos/seed/wxpage/120/120',
      coverUrl: 'https://picsum.photos/seed/wxpagec/800/200',
      reviews: { create: { userId: david.id, rating: 5, content: 'Smooth payment flow!' } },
    },
  })

  await prisma.notification.create({
    data: {
      userId: mike.id,
      actorId: sarah.id,
      type: NotificationType.MESSAGE,
      title: 'New message',
      body: 'Sarah: Alex, did you see the Moments post?',
      link: `/chat/${dm.id}`,
    },
  })

  await prisma.event.create({
    data: {
      title: 'WeChat Dev Meetup',
      date: new Date(Date.now() + 6 * 86400000),
      location: 'Online',
      imageUrl: 'https://picsum.photos/seed/wxev/400/200',
      attendeeIds: JSON.stringify([alex.id, emma.id]),
    },
  })

  console.log('Seed complete. Demo: demo@wechat.local / password')
  console.log(`Official account: /channels/${channel.slug}`)
  console.log(`Community: /groups/${group.id}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
