import { ChatRole, GroupPrivacy, MessageType, MomentVisibility, MomentsRange, NotificationType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma.js'

const pw = await bcrypt.hash('password', 10)

async function main() {
  await prisma.report.deleteMany()
  await prisma.feedback.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.momentAudience.deleteMany()
  await prisma.contactTagMember.deleteMany()
  await prisma.contactTag.deleteMany()
  await prisma.friendship.deleteMany()
  await prisma.momentComment.deleteMany()
  await prisma.momentLike.deleteMany()
  await prisma.moment.deleteMany()
  await prisma.channelPost.deleteMany()
  await prisma.channelFollow.deleteMany()
  await prisma.channel.deleteMany()
  await prisma.groupChatInvite.deleteMany()
  await prisma.messageMention.deleteMany()
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
    // Not Alex's contacts: used to demonstrate that likes/comments are only shown to mutual friends.
    { email: 'lily.c@email.com', username: 'lily-wx', wechatId: 'wx_lilyc', displayName: 'Lily Chen', phone: '+86 138 0000 1005', firstName: 'Lily', lastName: 'Chen' },
    { email: 'tom.z@email.com', username: 'tom-wx', wechatId: 'wx_tomz', displayName: 'Tom Zhang', phone: '+86 138 0000 1006', firstName: 'Tom', lastName: 'Zhang' },
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

  const [alex, sarah, mike, emma, david, lily, tom] = created

  // ── Friendships (mutual contacts) ──
  const pairs: [typeof alex, typeof alex][] = [
    [alex, sarah], [alex, mike], [alex, emma], [alex, david],
    [sarah, mike], [sarah, lily], [sarah, emma],
    [mike, emma], [mike, tom],
    [emma, david],
    [lily, tom],
  ]
  for (const [a, b] of pairs) {
    await prisma.friendship.createMany({
      data: [
        { userId: a.id, friendId: b.id },
        { userId: b.id, friendId: a.id },
      ],
    })
  }
  // Alex: "Hide their Moments" for David (hidden from Alex's feed, still on David's album).
  await prisma.friendship.update({
    where: { userId_friendId: { userId: alex.id, friendId: david.id } },
    data: { hideTheirMoments: true },
  })
  // Emma: "Don't let them see my Moments" for David.
  await prisma.friendship.update({
    where: { userId_friendId: { userId: emma.id, friendId: david.id } },
    data: { blockMyMoments: true },
  })

  // ── Moments visibility range: Mike only shows the last 3 days, Sarah the last 6 months ──
  await prisma.userSettings.update({ where: { userId: mike.id }, data: { momentsRange: MomentsRange.THREE_DAYS } })
  await prisma.userSettings.update({ where: { userId: sarah.id }, data: { momentsRange: MomentsRange.SIX_MONTHS } })

  // ── Contact tags ──
  const tag = (ownerId: string, name: string, members: { id: string }[]) =>
    prisma.contactTag.create({
      data: { ownerId, name, members: { create: members.map((m) => ({ userId: m.id })) } },
    })
  const alexFamily = await tag(alex.id, 'Family', [emma])
  const alexColleagues = await tag(alex.id, 'Colleagues', [sarah, mike])
  await tag(alex.id, 'College', [david])
  const sarahWork = await tag(sarah.id, 'Work', [mike])
  await tag(sarah.id, 'Besties', [lily, emma])
  const emmaFamily = await tag(emma.id, 'Family', [alex])

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

  // ── Group chats: Alex owns "Project Team" and is a member of Mike's "Weekend Hikers" ──
  const MIN = 60000
  const ago = (ms: number) => new Date(Date.now() - ms)
  const notice = 'Sprint demo is on Friday at 4pm 🎯 Please upload your slides to the shared drive by Thursday evening.'
  const projectTeam = await prisma.thread.create({
    data: {
      isGroup: true,
      name: 'Project Team',
      announcement: notice,
      announcementAt: ago(90 * MIN),
      announcementById: alex.id,
      participants: {
        create: [
          { userId: alex.id, role: ChatRole.OWNER, joinedAt: ago(30 * 24 * 60 * MIN) },
          { userId: sarah.id, role: ChatRole.ADMIN, joinedAt: ago(30 * 24 * 60 * MIN), unread: 2, lastReadAt: ago(100 * MIN) },
          { userId: mike.id, joinedAt: ago(30 * 24 * 60 * MIN), unread: 3, lastReadAt: ago(100 * MIN) },
          { userId: emma.id, joinedAt: ago(30 * 24 * 60 * MIN) },
        ],
      },
    },
  })
  await prisma.message.create({ data: { threadId: projectTeam.id, senderId: alex.id, content: 'Team sync at 3pm today', createdAt: ago(120 * MIN), read: true } })
  await prisma.message.create({ data: { threadId: projectTeam.id, senderId: mike.id, content: 'Got it 👌', createdAt: ago(110 * MIN), read: true } })
  await prisma.message.create({
    data: { threadId: projectTeam.id, senderId: alex.id, content: notice, type: MessageType.NOTICE, mentionAll: true, createdAt: ago(90 * MIN) },
  })
  await prisma.message.create({
    data: {
      threadId: projectTeam.id,
      senderId: sarah.id,
      content: '@Mike Jones can you share the latest build before the demo?',
      createdAt: ago(60 * MIN),
      mentions: { create: { userId: mike.id } },
    },
  })
  await prisma.message.create({
    data: {
      threadId: projectTeam.id,
      senderId: emma.id,
      content: '@Alex Morgan I booked the big meeting room for Friday 👍',
      createdAt: ago(45 * MIN),
      read: true,
      mentions: { create: { userId: alex.id } },
    },
  })
  await prisma.thread.update({ where: { id: projectTeam.id }, data: { updatedAt: ago(45 * MIN) } })

  const hikers = await prisma.thread.create({
    data: {
      isGroup: true,
      name: 'Weekend Hikers ⛰️',
      participants: {
        create: [
          { userId: mike.id, role: ChatRole.OWNER, joinedAt: ago(14 * 24 * 60 * MIN) },
          { userId: emma.id, role: ChatRole.ADMIN, joinedAt: ago(14 * 24 * 60 * MIN) },
          // Alex last read the chat before the @mentions below, so the chat list shows "[You were mentioned]".
          { userId: alex.id, alias: 'Snack Captain', joinedAt: ago(13 * 24 * 60 * MIN), unread: 3, lastReadAt: ago(40 * MIN) },
          { userId: sarah.id, joinedAt: ago(10 * 24 * 60 * MIN), unread: 3, lastReadAt: ago(40 * MIN) },
          { userId: david.id, joinedAt: ago(9 * 24 * 60 * MIN), unread: 3, lastReadAt: ago(40 * MIN) },
        ],
      },
    },
  })
  await prisma.message.create({ data: { threadId: hikers.id, senderId: david.id, content: 'David Lee joined the group chat via QR code', type: MessageType.SYSTEM, createdAt: ago(9 * 24 * 60 * MIN), read: true } })
  await prisma.message.create({ data: { threadId: hikers.id, senderId: mike.id, content: 'Who is in for Huangshan this Saturday?', createdAt: ago(50 * MIN), read: true } })
  await prisma.message.create({
    data: { threadId: hikers.id, senderId: mike.id, content: "@All Bus leaves at 7am sharp from People's Square 🚌", mentionAll: true, createdAt: ago(30 * MIN) },
  })
  await prisma.message.create({
    data: {
      threadId: hikers.id,
      senderId: emma.id,
      content: '@Snack Captain you promised to bring the snacks 😄',
      createdAt: ago(20 * MIN),
      mentions: { create: { userId: alex.id } },
    },
  })
  await prisma.message.create({ data: { threadId: hikers.id, senderId: sarah.id, content: 'Count me in!', createdAt: ago(10 * MIN) } })
  await prisma.thread.update({ where: { id: hikers.id }, data: { updatedAt: ago(10 * MIN) } })

  // Group QR codes: one active (6 days left) and one expired, for the join flow.
  const DAY_MS = 24 * 60 * MIN
  await prisma.groupChatInvite.create({
    data: { token: 'demo-project-team', threadId: projectTeam.id, createdById: alex.id, createdAt: ago(DAY_MS), expiresAt: new Date(Date.now() + 6 * DAY_MS) },
  })
  await prisma.groupChatInvite.create({
    data: { token: 'demo-expired-invite', threadId: hikers.id, createdById: mike.id, createdAt: ago(8 * DAY_MS), expiresAt: ago(DAY_MS) },
  })

  await prisma.notification.create({
    data: {
      userId: alex.id,
      actorId: emma.id,
      type: NotificationType.GROUP_MENTION,
      title: 'Emma Wilson mentioned you in Weekend Hikers ⛰️',
      body: '@Snack Captain you promised to bring the snacks 😄',
      link: `/chat/${hikers.id}`,
    },
  })
  await prisma.notification.createMany({
    data: [sarah, mike, emma].map((u) => ({
      userId: u.id,
      actorId: alex.id,
      type: NotificationType.GROUP_NOTICE,
      title: 'Group Notice in Project Team',
      body: notice,
      link: `/chat/${projectTeam.id}`,
    })),
  })

  // ── Moments: a mix of public and restricted posts ──
  const HOUR = 3600000
  const DAY = 24 * HOUR
  type Audience = { tagId?: string; userId?: string }[]
  const moment = async (
    author: { id: string },
    content: string,
    agoMs: number,
    opts: { visibility?: MomentVisibility; audience?: Audience; image?: string; location?: string } = {},
  ) =>
    prisma.moment.create({
      data: {
        authorId: author.id,
        content,
        imageUrl: opts.image ? `https://picsum.photos/seed/${opts.image}/800/600` : null,
        location: opts.location ?? '',
        visibility: opts.visibility ?? MomentVisibility.PUBLIC,
        createdAt: new Date(Date.now() - agoMs),
        audience: { create: opts.audience ?? [] },
      },
    })
  const like = (m: { id: string }, users: { id: string }[]) =>
    prisma.momentLike.createMany({ data: users.map((u) => ({ momentId: m.id, userId: u.id })) })
  const comment = (m: { id: string }, author: { id: string }, content: string) =>
    prisma.momentComment.create({ data: { momentId: m.id, authorId: author.id, content } })

  // Sarah: public post with likes/comments from Alex's friends (Mike, Emma) and a non-friend (Lily).
  const sarahLunch = await moment(sarah, 'Lunch with friends #food 🍜', 2 * HOUR, { image: 'wxmoment1', location: 'Shanghai' })
  await like(sarahLunch, [mike, lily, emma])
  await comment(sarahLunch, lily, 'Thanks for inviting me! 🥰')
  await comment(sarahLunch, mike, 'Next time I am paying')
  await comment(sarahLunch, sarah, 'Deal!')
  // Sarah: "Visible to" her Work tag (Mike only). Hidden from Alex.
  await moment(sarah, 'Quarterly numbers look great, keep it quiet for now 🤫', 5 * HOUR, {
    visibility: MomentVisibility.INCLUDE,
    audience: [{ tagId: sarahWork.id }],
  })
  // Sarah: "Don't share with" Alex (surprise party). Hidden from Alex, visible to Mike, Emma, Lily.
  const sarahParty = await moment(sarah, 'Planning a surprise party for Alex 🎉 do not tell him!', 8 * HOUR, {
    visibility: MomentVisibility.EXCLUDE,
    audience: [{ userId: alex.id }],
    image: 'wxparty',
  })
  await like(sarahParty, [mike, lily])
  // Sarah: older public post (120 days ago, inside her 6-month range).
  await moment(sarah, 'Throwback to spring in Hangzhou 🌸', 120 * DAY, { image: 'wxhangzhou', location: 'Hangzhou' })

  // Mike: "last 3 days" range, so only the first post is visible to friends.
  const mikeRecent = await moment(mike, 'Weekend hiking trip ⛰️', 1 * DAY, { image: 'wxmoment2', location: 'Huangshan' })
  await like(mikeRecent, [alex, emma, tom])
  await comment(mikeRecent, tom, 'Epic view, bro!')
  await comment(mikeRecent, emma, 'Take me next time!')
  await moment(mike, 'New gadget unboxing 📱', 10 * DAY, { image: 'wxmoment3' })
  await moment(mike, 'Marathon finished! 42km 🏃', 40 * DAY, { image: 'wxmarathon', location: 'Beijing' })

  // Emma: "Visible to" her Family tag (includes Alex), a private note and a public post.
  const emmaFamilyPost = await moment(emma, 'Family dinner at grandma\'s 🥟', 3 * HOUR, {
    visibility: MomentVisibility.INCLUDE,
    audience: [{ tagId: emmaFamily.id }],
    image: 'wxdinner',
  })
  await like(emmaFamilyPost, [alex])
  await moment(emma, 'Note to self: book dentist appointment', 6 * HOUR, { visibility: MomentVisibility.PRIVATE })
  const emmaPublic = await moment(emma, 'Beautiful day in the city 🌤️', 26 * HOUR, { image: 'wxmoment0', location: 'Shanghai' })
  await like(emmaPublic, [sarah, mike, david])
  await comment(emmaPublic, david, 'Love this shot')

  // David: Alex hides David's Moments from his feed (still visible on David's album).
  await moment(david, 'Conference keynote done ✅', 4 * HOUR, { image: 'wxkeynote', location: 'Shenzhen' })

  // Lily & Tom: not Alex's contacts, so their posts never reach Alex.
  await moment(lily, 'Coffee art practice ☕', 7 * HOUR, { image: 'wxcoffee' })
  await moment(tom, 'Night market eats 🍢', 9 * HOUR, { image: 'wxnight' })

  // Alex (demo): public, tag-restricted, tag-excluded and private posts.
  const alexPublic = await moment(alex, 'Nice photo from Shanghai 🏙️', 1 * HOUR, { image: 'wxmoment4', location: 'Shanghai' })
  await like(alexPublic, [sarah, mike, emma, david])
  await comment(alexPublic, sarah, 'So good!')
  await comment(alexPublic, david, 'Where is this?')
  await moment(alex, 'Team offsite photos 📸', 30 * HOUR, {
    visibility: MomentVisibility.INCLUDE,
    audience: [{ tagId: alexColleagues.id }],
    image: 'wxoffsite',
  })
  await moment(alex, 'Picked a birthday gift for mom 🎁', 2 * DAY, {
    visibility: MomentVisibility.EXCLUDE,
    audience: [{ tagId: alexFamily.id }],
  })
  await moment(alex, 'Reading list: 3 books this month 📚', 4 * DAY, { visibility: MomentVisibility.PRIVATE })

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
  console.log('Moments privacy demo users: mike.j@email.com (3-day range), lily.c@email.com (not a contact of Alex)')
  console.log(`Official account: /channels/${channel.slug}`)
  console.log(`Community: /groups/${group.id}`)
  console.log('Group chat invites: /group-chat/join/demo-project-team (active), /group-chat/join/demo-expired-invite (expired)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
