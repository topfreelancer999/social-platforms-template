import { GroupPrivacy, NotificationType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma.js'

const pw = await bcrypt.hash('password', 10)

async function main() {
  await prisma.report.deleteMany()
  await prisma.feedback.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.commentVote.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.postVote.deleteMany()
  await prisma.post.deleteMany()
  await prisma.subredditMember.deleteMany()
  await prisma.subreddit.deleteMany()
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
    { email: 'demo@reddit.local', username: 'alex_dev', displayName: 'AlexDev', firstName: 'Alex', lastName: 'Morgan', karma: 4200 },
    { email: 'sarah.k@email.com', username: 'sarah_k', displayName: 'SarahK', firstName: 'Sarah', lastName: 'Kim', karma: 1800 },
    { email: 'mike.j@email.com', username: 'mike_gamer', displayName: 'MikePlays', firstName: 'Mike', lastName: 'Jones', karma: 950 },
    { email: 'emma.w@email.com', username: 'emma_art', displayName: 'EmmaArt', firstName: 'Emma', lastName: 'Wilson', karma: 2100 },
    { email: 'david.l@email.com', username: 'david_tech', displayName: 'DavidTech', firstName: 'David', lastName: 'Lee', karma: 5600 },
  ]

  const created = []
  for (let i = 0; i < users.length; i++) {
    const u = users[i]
    const user = await prisma.user.create({
      data: {
        ...u,
        passwordHash: pw,
        bio: 'Redditor · building cool stuff',
        avatarUrl: `https://i.pravatar.cc/150?img=${i + 1}`,
        coverUrl: `https://picsum.photos/seed/rd${i}/1200/300`,
        settings: { create: {} },
      },
    })
    created.push(user)
  }

  const [alex, sarah, mike, emma, david] = created

  const subs = [
    { name: 'programming', slug: 'programming', desc: 'All things code' },
    { name: 'gaming', slug: 'gaming', desc: 'Games and gaming culture' },
    { name: 'technology', slug: 'technology', desc: 'Tech news and discussion' },
    { name: 'AskReddit', slug: 'askreddit', desc: 'Ask the community anything' },
  ]

  const subRecords = []
  for (let i = 0; i < subs.length; i++) {
    const s = subs[i]
    const sub = await prisma.subreddit.create({
      data: {
        name: s.name,
        slug: s.slug,
        description: s.desc,
        iconUrl: `https://picsum.photos/seed/${s.slug}/128/128`,
        bannerUrl: `https://picsum.photos/seed/${s.slug}b/1200/300`,
        creatorId: created[i % created.length].id,
        members: { create: created.map((u) => ({ userId: u.id })) },
      },
    })
    subRecords.push(sub)
  }

  const titles = [
    'What is your favorite open-source tool in 2026?',
    'Just shipped my first React + Node monorepo',
    'Best co-op games to play this weekend?',
    'TIL Redis can back Socket.io across instances',
    'Unpopular opinion: tabs are better than spaces',
    'How do you stay motivated while learning backend?',
  ]

  for (let i = 0; i < 12; i++) {
    const author = created[i % created.length]
    const sub = subRecords[i % subRecords.length]
    const post = await prisma.post.create({
      data: {
        authorId: author.id,
        subredditId: sub.id,
        title: titles[i % titles.length],
        body: `Discussion thread #${i + 1}. Share your thoughts in the comments!\n\nEdit: thanks for the upvotes!`,
        imageUrl: i % 3 === 0 ? `https://picsum.photos/seed/rdpost${i}/800/450` : null,
        createdAt: new Date(Date.now() - i * 3600000),
      },
    })
    await prisma.postVote.create({ data: { postId: post.id, userId: mike.id, value: 1 } })
    await prisma.postVote.create({ data: { postId: post.id, userId: emma.id, value: 1 } })
    if (i % 4 === 0) await prisma.postVote.create({ data: { postId: post.id, userId: david.id, value: -1 } })
    const c = await prisma.comment.create({
      data: { postId: post.id, authorId: sarah.id, content: 'Great post, thanks for sharing!' },
    })
    await prisma.commentVote.create({ data: { commentId: c.id, userId: alex.id, value: 1 } })
  }

  const group = await prisma.group.create({
    data: {
      name: 'Reddit Clone Builders',
      description: 'Discuss features and PRs',
      imageUrl: 'https://picsum.photos/seed/rdgrp/200/200',
      privacy: GroupPrivacy.PUBLIC,
      creatorId: alex.id,
      members: { create: created.map((u) => ({ userId: u.id })) },
    },
  })

  await prisma.page.create({
    data: {
      slug: 'reddit-premium',
      name: 'Reddit Premium Partner',
      category: 'Partner',
      description: 'Ads-free experience',
      imageUrl: 'https://picsum.photos/seed/rdpage/120/120',
      coverUrl: 'https://picsum.photos/seed/rdpagec/800/200',
      reviews: { create: { userId: david.id, rating: 4, content: 'Solid value for power users.' } },
    },
  })

  const thread = await prisma.thread.create({
    data: {
      participants: { create: [{ userId: alex.id }, { userId: sarah.id }] },
      messages: {
        create: [
          { senderId: sarah.id, content: 'Saw your post on r/programming — nice work!' },
          { senderId: alex.id, content: 'Thanks! Happy to share the repo.' },
        ],
      },
    },
  })

  await prisma.notification.create({
    data: {
      userId: alex.id,
      actorId: sarah.id,
      type: NotificationType.COMMENT_REPLY,
      title: 'New comment',
      body: 'Sarah replied to your post',
      link: '/',
    },
  })

  await prisma.event.create({
    data: {
      title: 'Subreddit Mod AMA',
      date: new Date(Date.now() + 5 * 86400000),
      location: 'r/AskReddit',
      imageUrl: 'https://picsum.photos/seed/rdev/400/200',
      attendeeIds: JSON.stringify([alex.id, emma.id]),
    },
  })

  console.log('Seed complete. Demo: demo@reddit.local / password')
  console.log(`Community group: ${group.id}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
