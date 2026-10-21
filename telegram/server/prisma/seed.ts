import { GroupPrivacy, NotificationType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma.js'

const pw = await bcrypt.hash('password', 10)

async function main() {
  await prisma.report.deleteMany()
  await prisma.feedback.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.messageHidden.deleteMany()
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

  const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000)
  const name = (u: { displayName: string; firstName: string }) => u.displayName || u.firstName

  // Alex ↔ Sarah: a reply chain plus an edited message. The opener is 3 days old, so it is
  // past Telegram's 48h edit window (handy for trying the "can't edit" path).
  const dmThread = await prisma.thread.create({
    data: { participants: { create: [{ userId: alex.id }, { userId: sarah.id }] } },
  })
  const say = (threadId: string, senderId: string, content: string, at: Date, extra: Record<string, unknown> = {}) =>
    prisma.message.create({ data: { threadId, senderId, content, createdAt: at, read: true, ...extra } })

  await say(dmThread.id, alex.id, 'Morning! Are we still on for the release review?', minutesAgo(3 * 24 * 60))
  const channelQ = await say(dmThread.id, sarah.id, 'Hey Alex! Did you see the channel update?', minutesAgo(95))
  const subscribed = await say(dmThread.id, alex.id, 'Yes — subscribing now 👍', minutesAgo(93), { replyToId: channelQ.id })
  await say(dmThread.id, sarah.id, 'Great. Let me know if you want the group invite.', minutesAgo(90), { replyToId: subscribed.id })
  await say(dmThread.id, alex.id, 'Sure, send it over — I can join the standup tomorrow at 10:00.', minutesAgo(60), {
    editedAt: minutesAgo(55),
  })
  await say(dmThread.id, sarah.id, 'Done! Check your invites 🙌', minutesAgo(20), { read: false })
  await prisma.threadParticipant.update({
    where: { threadId_userId: { threadId: dmThread.id, userId: alex.id } },
    data: { unread: 1 },
  })

  const groupThread = await prisma.thread.create({
    data: {
      isGroup: true,
      name: 'Dev Team Chat',
      avatarUrl: 'https://picsum.photos/seed/tggrp/200/200',
      participants: { create: created.map((u) => ({ userId: u.id })) },
    },
  })
  const welcome = await say(groupThread.id, mike.id, 'Welcome everyone to the group!', minutesAgo(240))
  await say(groupThread.id, emma.id, 'Thanks Mike 🎉', minutesAgo(235), { replyToId: welcome.id })
  // David replies to a message Mike later deleted for everyone → the quote reads "Deleted message".
  const oops = await say(groupThread.id, mike.id, 'Staging password is hunter2', minutesAgo(180))
  await say(groupThread.id, david.id, 'Mike, you might want to delete that 😅', minutesAgo(178), { replyToId: oops.id })
  await prisma.$transaction([
    prisma.message.updateMany({ where: { replyToId: oops.id }, data: { replyToDeleted: true } }),
    prisma.message.delete({ where: { id: oops.id } }),
  ])
  await say(groupThread.id, mike.id, 'Done, thanks! Rotated it too.', minutesAgo(175))
  // Forwarded from the DM above: the copy keeps Sarah as the original author and date.
  await say(groupThread.id, alex.id, channelQ.content, minutesAgo(30), {
    forwardedFromId: sarah.id,
    forwardedFromName: name(sarah),
    forwardedDate: channelQ.createdAt,
  })
  await say(groupThread.id, emma.id, 'Ha, yes — the channel update was great.', minutesAgo(28))

  // Alex ↔ Mike: Mike forwarded one of Alex's own messages back with a question.
  const mikeThread = await prisma.thread.create({
    data: { participants: { create: [{ userId: alex.id }, { userId: mike.id }] } },
  })
  await say(mikeThread.id, mike.id, subscribed.content, minutesAgo(45), {
    forwardedFromId: alex.id,
    forwardedFromName: name(alex),
    forwardedDate: subscribed.createdAt,
  })
  await say(mikeThread.id, mike.id, 'Which channel was this about?', minutesAgo(44))
  await say(mikeThread.id, alex.id, 'Tech News Daily — the launch post.', minutesAgo(40))

  // Most recent activity first in the chat list.
  await prisma.thread.update({ where: { id: groupThread.id }, data: { updatedAt: minutesAgo(28) } })
  await prisma.thread.update({ where: { id: mikeThread.id }, data: { updatedAt: minutesAgo(40) } })
  await prisma.thread.update({ where: { id: dmThread.id }, data: { updatedAt: minutesAgo(20) } })

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
