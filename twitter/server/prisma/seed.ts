import { CommunityPrivacy, NotificationType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma.js'
import { linkHashtags } from '../src/lib/hashtags.js'

const pw = await bcrypt.hash('password', 10)

const users = [
  { email: 'demo@x.local', username: 'alex-morgan', firstName: 'Alex', lastName: 'Morgan', bio: 'Building the future. #tech #startups', location: 'Austin, TX', workplace: 'TechStart', verified: true },
  { email: 'sarah.k@email.com', username: 'sarah-kim', firstName: 'Sarah', lastName: 'Kim', bio: 'Designer & photographer', location: 'San Francisco, CA', workplace: 'Creative Co' },
  { email: 'mike.j@email.com', username: 'mike-jones', firstName: 'Mike', lastName: 'Jones', bio: 'Sports & news', location: 'Chicago, IL', workplace: 'SportsNet' },
  { email: 'emma.w@email.com', username: 'emma-wilson', firstName: 'Emma', lastName: 'Wilson', bio: 'Mom of 2 | #family', location: 'Denver, CO', workplace: '' },
  { email: 'david.l@email.com', username: 'david-lee', firstName: 'David', lastName: 'Lee', bio: 'Full-stack dev', location: 'Seattle, WA', workplace: 'CloudNine', verified: true },
  { email: 'lisa.p@email.com', username: 'lisa-park', firstName: 'Lisa', lastName: 'Park', bio: 'Food blogger #foodie', location: 'Los Angeles, CA', workplace: '' },
  { email: 'tom.h@email.com', username: 'tom-harris', firstName: 'Tom', lastName: 'Harris', bio: 'Musician', location: 'Nashville, TN', workplace: '' },
  { email: 'nina.p@email.com', username: 'nina-patel', firstName: 'Nina', lastName: 'Patel', bio: 'CS student @ MIT', location: 'Boston, MA', workplace: 'MIT' },
  { email: 'chris.m@email.com', username: 'chris-martin', firstName: 'Chris', lastName: 'Martin', bio: 'Fitness coach', location: 'Miami, FL', workplace: 'FitLife' },
  { email: 'amy.k@email.com', username: 'amy-kim', firstName: 'Amy', lastName: 'Kim', bio: 'Travel addict ✈️', location: 'Portland, OR', workplace: '' },
]

async function main() {
  await prisma.report.deleteMany()
  await prisma.feedback.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.message.deleteMany()
  await prisma.threadParticipant.deleteMany()
  await prisma.thread.deleteMany()
  await prisma.review.deleteMany()
  await prisma.tweetHashtag.deleteMany()
  await prisma.hashtag.deleteMany()
  await prisma.bookmark.deleteMany()
  await prisma.retweet.deleteMany()
  await prisma.tweetLike.deleteMany()
  await prisma.tweet.deleteMany()
  await prisma.communityMember.deleteMany()
  await prisma.community.deleteMany()
  await prisma.block.deleteMany()
  await prisma.follow.deleteMany()
  await prisma.userSettings.deleteMany()
  await prisma.user.deleteMany()
  await prisma.page.deleteMany()
  await prisma.event.deleteMany()

  const createdUsers = []
  for (let i = 0; i < users.length; i++) {
    const u = users[i]
    const user = await prisma.user.create({
      data: {
        ...u,
        email: u.email,
        passwordHash: pw,
        avatarUrl: `https://i.pravatar.cc/150?img=${i + 1}`,
        coverUrl: `https://picsum.photos/seed/x${i}/1200/400`,
        settings: { create: {} },
      },
    })
    createdUsers.push(user)
  }

  const [alex, sarah, mike, emma, david] = createdUsers

  for (const [follower, following] of [
    [alex, sarah], [alex, mike], [alex, emma], [alex, david],
    [sarah, alex], [sarah, emma], [mike, alex], [mike, david],
    [emma, sarah], [david, alex], [createdUsers[5], createdUsers[9]],
  ] as const) {
    await prisma.follow.create({
      data: { followerId: follower.id, followingId: following.id },
    })
  }

  const contents = [
    'Great day today! ☀️ #life',
    'Just shipped a new feature — excited to share soon! #tech #buildinpublic',
    'Who else is watching the game tonight?',
    'Weekend vibes with friends.',
    'New recipe turned out amazing! #foodie',
    'Thoughts on remote work in 2026?',
    'Happy birthday to everyone celebrating today! 🎂',
    'Throwback to last summer.',
  ]

  const seeded = []
  for (let i = 0; i < 24; i++) {
    const author = createdUsers[i % createdUsers.length]
    const tweet = await prisma.tweet.create({
      data: {
        authorId: author.id,
        content: contents[i % contents.length],
        imageUrl: i % 4 === 0 ? `https://picsum.photos/seed/tw${i}/600/400` : null,
        createdAt: new Date(Date.now() - i * 3600000),
      },
    })
    await linkHashtags(tweet.id, tweet.content)
    seeded.push(tweet)
    if (i < 10) {
      await prisma.tweetLike.create({ data: { tweetId: tweet.id, userId: alex.id } })
      if (i % 2 === 0) {
        await prisma.tweet.create({
          data: { authorId: sarah.id, content: 'Love this!', replyToId: tweet.id },
        })
      }
    }
  }

  const community = await prisma.community.create({
    data: {
      name: 'Austin Tech',
      description: 'Local tech, startups, and jobs #austin #tech',
      imageUrl: 'https://picsum.photos/seed/c1/200',
      privacy: CommunityPrivacy.PUBLIC,
      creatorId: alex.id,
      members: {
        create: [{ userId: alex.id }, { userId: sarah.id }, { userId: david.id }],
      },
    },
  })
  const commTweet = await prisma.tweet.create({
    data: {
      authorId: sarah.id,
      content: 'Meetup this Saturday at 2pm! #meetup',
      communityId: community.id,
    },
  })
  await linkHashtags(commTweet.id, commTweet.content)

  // --- Reposts & quote posts -------------------------------------------------
  const minutesAgo = (m: number) => new Date(Date.now() - m * 60000)
  const repost = (userId: string, tweetId: string, m: number) =>
    prisma.retweet.create({ data: { userId, tweetId, createdAt: minutesAgo(m) } })
  const quote = async (authorId: string, quoteTweetId: string, content: string, m: number) => {
    const q = await prisma.tweet.create({
      data: { authorId, content, quoteTweetId, isQuote: true, createdAt: minutesAgo(m) },
    })
    await linkHashtags(q.id, q.content)
    return q
  }
  const [lisa, , , , amy] = createdUsers.slice(5)

  // Followed users repost into Alex's home timeline (Mike's post is reposted
  // twice but only shows once thanks to timeline de-duplication).
  await repost(sarah.id, seeded[2].id, 20)
  await repost(david.id, seeded[2].id, 50)
  await repost(emma.id, seeded[9].id, 70)
  // Others repost Alex's posts (counts + notifications).
  await repost(mike.id, seeded[0].id, 35)
  await repost(david.id, seeded[10].id, 150)
  await repost(amy.id, seeded[0].id, 160)
  // Alex's own reposts show on his profile.
  await repost(alex.id, seeded[1].id, 10)
  await repost(alex.id, seeded[4].id, 90)

  const sarahQuote = await quote(sarah.id, seeded[10].id, "Already have the snacks ready 🍿 Who's hosting?", 15)
  await quote(david.id, seeded[1].id, "This is the kind of #buildinpublic energy I love. Can't wait to try it.", 40)
  await quote(mike.id, seeded[1].id, 'Ship it! 🚀', 100)
  await quote(lisa.id, seeded[1].id, 'Congrats Sarah — the new flow looks slick.', 130)
  await quote(alex.id, seeded[5].id, 'Hybrid with intentional in-person weeks, async by default. #tech', 25)
  await prisma.tweetLike.create({ data: { tweetId: sarahQuote.id, userId: alex.id } })
  await repost(mike.id, sarahQuote.id, 12)

  // A quote whose original was deleted renders "This post is unavailable".
  const deletedOriginal = await prisma.tweet.create({
    data: { authorId: emma.id, content: 'Hot take: pineapple belongs on pizza 🍍', createdAt: minutesAgo(240) },
  })
  await quote(mike.id, deletedOriginal.id, 'Respectfully… no.', 55)
  await prisma.tweet.delete({ where: { id: deletedOriginal.id } })

  await prisma.notification.createMany({
    data: [
      { userId: alex.id, actorId: mike.id, type: NotificationType.RETWEET, title: 'Mike Jones reposted your post', body: seeded[0].content, link: `/tweet/${seeded[0].id}`, createdAt: minutesAgo(35) },
      { userId: alex.id, actorId: sarah.id, type: NotificationType.QUOTE, title: 'Sarah Kim quoted your post', body: sarahQuote.content, link: `/tweet/${sarahQuote.id}`, createdAt: minutesAgo(15) },
      { userId: alex.id, actorId: david.id, type: NotificationType.RETWEET, title: 'David Lee reposted your post', body: seeded[10].content, link: `/tweet/${seeded[10].id}`, createdAt: minutesAgo(150) },
      { userId: alex.id, actorId: amy.id, type: NotificationType.RETWEET, title: 'Amy Kim reposted your post', body: seeded[0].content, link: `/tweet/${seeded[0].id}`, createdAt: minutesAgo(160) },
    ],
  })

  await prisma.community.create({
    data: {
      name: 'Home Cooks',
      description: 'Recipes and tips #food',
      imageUrl: 'https://picsum.photos/seed/c2/200',
      privacy: CommunityPrivacy.PUBLIC,
      creatorId: createdUsers[5].id,
      members: { create: [{ userId: createdUsers[5].id }, { userId: emma.id }] },
    },
  })

  const pages = await Promise.all([
    prisma.page.create({ data: { slug: 'techstart', name: 'TechStart', category: 'Technology', description: 'Innovation for everyone', imageUrl: 'https://picsum.photos/seed/p1/100', coverUrl: 'https://picsum.photos/seed/pc1/1200/400' } }),
    prisma.page.create({ data: { slug: 'bella-cafe', name: 'Bella Cafe', category: 'Restaurant', description: 'Best coffee in town', imageUrl: 'https://picsum.photos/seed/p2/100', coverUrl: 'https://picsum.photos/seed/pc2/1200/400' } }),
    prisma.page.create({ data: { slug: 'fitlife-gym', name: 'FitLife Gym', category: 'Fitness', description: 'Transform your body', imageUrl: 'https://picsum.photos/seed/p3/100', coverUrl: 'https://picsum.photos/seed/pc3/1200/400' } }),
  ])

  for (const page of pages) {
    await prisma.review.create({
      data: { pageId: page.id, userId: sarah.id, rating: 5, content: 'Highly recommend!' },
    })
  }

  const thread = await prisma.thread.create({
    data: {
      participants: {
        create: [{ userId: alex.id, unread: 0 }, { userId: sarah.id, unread: 1 }],
      },
    },
  })
  await prisma.message.createMany({
    data: [
      { threadId: thread.id, senderId: sarah.id, content: 'Hey Alex! How are you?', createdAt: new Date(Date.now() - 3600000) },
      { threadId: thread.id, senderId: alex.id, content: 'Doing great! Coffee Saturday?', createdAt: new Date(Date.now() - 1800000) },
      { threadId: thread.id, senderId: sarah.id, content: 'Sure!', createdAt: new Date(Date.now() - 900000) },
    ],
  })

  await prisma.notification.createMany({
    data: [
      { userId: alex.id, actorId: sarah.id, type: NotificationType.MESSAGE, title: 'Sarah sent you a message', body: 'Sure!', link: '/messages' },
      { userId: alex.id, actorId: mike.id, type: NotificationType.LIKE, title: 'Mike liked your post', body: '', link: '/' },
      { userId: alex.id, actorId: david.id, type: NotificationType.FOLLOW, title: 'David followed you', body: '', link: `/@${david.username}` },
    ],
  })

  await prisma.event.createMany({
    data: [
      { title: 'Tech Meetup Austin', date: new Date(Date.now() + 7 * 86400000), location: 'Zilker Park', imageUrl: 'https://picsum.photos/seed/ev1/400/200', attendeeIds: [alex.id] },
      { title: 'Live Music Night', date: new Date(Date.now() + 14 * 86400000), location: 'Nashville', imageUrl: 'https://picsum.photos/seed/ev2/400/200', attendeeIds: [] },
    ],
  })

  console.log('Seed complete. Demo: demo@x.local / password')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
