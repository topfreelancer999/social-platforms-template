import { GroupPrivacy, NotificationType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma.js'
import { recountVotes } from '../src/services/votes.js'

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
    { email: 'demo@reddit.local', username: 'alex_dev', displayName: 'AlexDev', firstName: 'Alex', lastName: 'Morgan' },
    { email: 'sarah.k@email.com', username: 'sarah_k', displayName: 'SarahK', firstName: 'Sarah', lastName: 'Kim' },
    { email: 'mike.j@email.com', username: 'mike_gamer', displayName: 'MikePlays', firstName: 'Mike', lastName: 'Jones' },
    { email: 'emma.w@email.com', username: 'emma_art', displayName: 'EmmaArt', firstName: 'Emma', lastName: 'Wilson' },
    { email: 'david.l@email.com', username: 'david_tech', displayName: 'DavidTech', firstName: 'David', lastName: 'Lee' },
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

  // Lurkers: quiet accounts that only vote, so seeded scores have a realistic
  // spread while every point of score and karma is backed by a real vote row.
  const lurkerAdjectives = ['quiet', 'sleepy', 'curious', 'rusty', 'cosmic', 'salty', 'fuzzy', 'brave', 'lazy', 'witty']
  const lurkerNouns = ['otter', 'falcon', 'badger', 'panda', 'lynx', 'heron']
  const lurkerData = lurkerAdjectives.flatMap((adj, i) =>
    lurkerNouns.map((noun, j) => {
      const username = `${adj}_${noun}${((i * 7 + j * 13) % 90) + 10}`
      return {
        email: `${username}@lurkers.reddit.local`,
        username,
        displayName: username,
        firstName: adj[0].toUpperCase() + adj.slice(1),
        lastName: noun[0].toUpperCase() + noun.slice(1),
        passwordHash: pw,
        avatarUrl: `https://i.pravatar.cc/150?u=${username}`,
        coverUrl: `https://picsum.photos/seed/${username}/1200/300`,
      }
    }),
  )
  await prisma.user.createMany({ data: lurkerData })
  const lurkers = await prisma.user.findMany({
    where: { email: { endsWith: '@lurkers.reddit.local' } },
    orderBy: { username: 'asc' },
  })

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

  // Hand-written threads. `ups`/`downs` are extra lurker votes on top of the
  // explicit votes from named users; authors always upvote their own content
  // (as Reddit does), which counts towards score but never towards karma.
  type Named = 'alex' | 'sarah' | 'mike' | 'emma' | 'david'
  type SeedVotes = Partial<Record<Named, 1 | -1>>
  type SeedComment = { by: Named; text: string; ups?: number; downs?: number; votes?: SeedVotes; replies?: SeedComment[] }
  type SeedPost = {
    by: Named
    sub: string
    title: string
    body: string
    image?: string
    hoursAgo: number
    ups: number
    downs: number
    votes?: SeedVotes
    comments?: SeedComment[]
  }
  const named: Record<Named, (typeof created)[number]> = { alex, sarah, mike, emma, david }
  const subBySlug = new Map(subRecords.map((s) => [s.slug, s]))

  const seedPosts: SeedPost[] = [
    {
      by: 'emma', sub: 'askreddit', hoursAgo: 1, ups: 31, downs: 1, votes: { alex: 1, sarah: 1 },
      title: "What's a small habit that genuinely improved your life?",
      body: 'Looking for low-effort things that actually stuck for you. Mine is making the bed — weirdly sets the tone for the day.',
      comments: [
        { by: 'sarah', text: 'Putting my phone in another room an hour before bed.', ups: 25, downs: 1, votes: { alex: 1 } },
        {
          by: 'alex', text: "Writing tomorrow's top three tasks before I log off.", ups: 13, votes: { emma: 1 },
          replies: [
            { by: 'emma', text: 'Stealing this. Do you use an app or paper?', ups: 3 },
            { by: 'alex', text: 'Sticky note on the monitor. Low tech wins.', ups: 6, votes: { emma: 1 } },
          ],
        },
        { by: 'david', text: 'A glass of water first thing in the morning.', ups: 7 },
      ],
    },
    {
      by: 'mike', sub: 'gaming', hoursAgo: 2, ups: 15, downs: 1, votes: { alex: 1 },
      title: 'Best co-op games to play this weekend?',
      body: 'Two of us, couch or online, nothing too sweaty. What are you playing?',
      comments: [
        {
          by: 'emma', text: 'It Takes Two, no contest.', ups: 20, downs: 1, votes: { alex: 1 },
          replies: [{ by: 'mike', text: 'Played it twice already, need something new!', ups: 6 }],
        },
        {
          by: 'alex', text: 'Deep Rock Galactic. Rock and stone!', ups: 17, votes: { mike: 1, david: 1 },
          replies: [{ by: 'david', text: 'Rock and stone, brother!', ups: 9, votes: { alex: 1 } }],
        },
        { by: 'sarah', text: 'Overcooked, if you want to test the friendship.', ups: 8, downs: 2 },
      ],
    },
    {
      by: 'alex', sub: 'programming', hoursAgo: 3, ups: 38, downs: 3, votes: { sarah: 1, mike: 1, emma: 1, david: 1 },
      title: 'Just shipped my first React + Node monorepo',
      body: 'Client, server and a shared package in one repo. Took a weekend to get the tooling right, but deploys are one command now.',
      comments: [
        {
          by: 'sarah', text: 'Congrats! How did you handle shared types between client and server?', ups: 12, votes: { alex: 1 },
          replies: [{ by: 'alex', text: 'A tiny shared package with Zod schemas — the types fall out of them for free.', ups: 9, votes: { sarah: 1 } }],
        },
        { by: 'mike', text: 'Monorepos are great until your install takes four minutes.', ups: 5, downs: 2 },
        {
          by: 'david', text: 'Turborepo or plain npm workspaces?', ups: 3,
          replies: [{ by: 'alex', text: 'Plain npm workspaces. Fewer moving parts.', ups: 4, votes: { david: 1 } }],
        },
      ],
    },
    {
      by: 'sarah', sub: 'technology', hoursAgo: 5, ups: 24, downs: 2, votes: { alex: 1, david: 1 },
      image: 'https://picsum.photos/seed/rdpost-redis/800/450',
      title: 'TIL Redis can back Socket.io across instances',
      body: 'The redis adapter fans events out between server instances, so rooms just work behind a load balancer.',
      comments: [
        { by: 'david', text: "One of those things you don't think about until you scale to two pods.", ups: 11 },
        { by: 'alex', text: 'Neat, but keep an eye on Redis memory once you have lots of rooms.', ups: 7, downs: 1, votes: { sarah: 1, emma: 1 } },
      ],
    },
    {
      by: 'david', sub: 'programming', hoursAgo: 7, ups: 9, downs: 17, votes: { alex: -1, sarah: -1, mike: 1 },
      title: 'Unpopular opinion: tabs are better than spaces',
      body: 'Accessibility alone should settle this: everyone gets to pick their own indent width.',
      comments: [
        { by: 'alex', text: 'Tabs for indentation, spaces for alignment. Fight me.', ups: 14, downs: 3, votes: { david: 1 } },
        { by: 'emma', text: 'Just let the formatter decide and stop arguing.', ups: 22, votes: { alex: 1 } },
        { by: 'mike', text: 'Spaces. Every style guide I have ever used agrees.', ups: 4, downs: 6, votes: { alex: -1 } },
      ],
    },
    {
      by: 'mike', sub: 'technology', hoursAgo: 9, ups: 13, downs: 11, votes: { alex: -1, david: 1 },
      title: 'Is anyone else tired of every app adding an AI chatbot?',
      body: 'My note-taking app, my bank, my thermostat. I just want buttons.',
      comments: [
        { by: 'sarah', text: 'Depends whether it actually does something useful.', ups: 9, downs: 1 },
        { by: 'david', text: 'The good ones are invisible.', ups: 3, downs: 5 },
      ],
    },
    {
      by: 'mike', sub: 'gaming', hoursAgo: 20, ups: 27, downs: 1, votes: { alex: 1, emma: 1, sarah: 1 },
      image: 'https://picsum.photos/seed/rdpost-speedrun/800/450',
      title: 'Finally finished my first speedrun under an hour',
      body: '58:41. Six months of practice, one very lucky boss skip.',
      comments: [{ by: 'emma', text: 'That last boss skip is wild.', ups: 8, votes: { alex: 1 } }],
    },
    {
      by: 'alex', sub: 'technology', hoursAgo: 26, ups: 4, downs: 7, votes: { mike: -1, david: 1 },
      image: 'https://picsum.photos/seed/rdpost-homelab/800/450',
      title: 'Self-hosting everything at home: worth it in 2026?',
      body: 'Thinking of moving photos, notes and passwords onto a mini PC in the closet. Talk me out of it.',
      comments: [
        { by: 'david', text: 'Worth it for learning, not for uptime.', ups: 10, votes: { alex: 1 } },
        { by: 'mike', text: 'Your electricity bill would like a word.', ups: 6, downs: 1 },
      ],
    },
    {
      by: 'sarah', sub: 'programming', hoursAgo: 30, ups: 18, downs: 2, votes: { alex: 1, emma: 1 },
      title: 'How do you stay motivated while learning backend?',
      body: 'Frontend gives you instant feedback. Backend feels like shouting into the void. Tips?',
      comments: [
        { by: 'alex', text: "Build something you'll actually use. A budget tracker kept me going for months.", ups: 15, votes: { sarah: 1 } },
        { by: 'mike', text: 'Honestly? Deadlines.', ups: 2, downs: 4 },
      ],
    },
    {
      by: 'emma', sub: 'technology', hoursAgo: 48, ups: 12, downs: 0,
      title: 'What is your favorite open-source tool in 2026?',
      body: 'Could be a CLI, a library, an app — whatever you would miss most if it vanished tomorrow.',
      comments: [
        { by: 'david', text: 'ripgrep. I use it a hundred times a day.', ups: 9, votes: { alex: 1 } },
        { by: 'alex', text: 'Prisma, for the schema-first workflow.', ups: 2, downs: 2 },
        { by: 'mike', text: 'Vim. Next question.', ups: 1, downs: 2 },
      ],
    },
    {
      by: 'david', sub: 'askreddit', hoursAgo: 55, ups: 21, downs: 1, votes: { alex: 1, sarah: 1, mike: 1 },
      title: "Developers: what's the worst bug you've ever shipped?",
      body: 'No judgement. We have all been there.',
      comments: [
        {
          by: 'alex', text: 'A timezone bug that only showed up on the last day of each month.', ups: 19, votes: { david: 1, sarah: 1 },
          replies: [{ by: 'sarah', text: 'Timezones are the final boss.', ups: 11, votes: { alex: 1 } }],
        },
        { by: 'mike', text: 'Deleted prod data with a migration. Once.', ups: 14 },
      ],
    },
    {
      by: 'emma', sub: 'gaming', hoursAgo: 72, ups: 34, downs: 2, votes: { alex: 1, mike: 1 },
      image: 'https://picsum.photos/seed/rdpost-farm/800/450',
      title: 'Fan art: my take on the new cozy farming game',
      body: 'Watercolour and a lot of patience. Feedback welcome!',
      comments: [{ by: 'alex', text: 'The lighting on this is gorgeous.', ups: 5, votes: { emma: 1 } }],
    },
  ]

  // Deterministic PRNG so every seed run produces the same scores.
  let rngState = 42
  const rand = () => {
    rngState = (rngState * 1664525 + 1013904223) % 2 ** 32
    return rngState / 2 ** 32
  }
  const voteRows = (authorId: string, votes: SeedVotes = {}, ups = 0, downs = 0) => {
    const rows = new Map<string, number>([[authorId, 1]])
    for (const [who, value] of Object.entries(votes)) rows.set(named[who as Named].id, value)
    const pool = lurkers.map((u) => ({ u, k: rand() })).sort((a, b) => a.k - b.k).map(({ u }) => u)
    pool.slice(0, ups).forEach((u) => rows.set(u.id, 1))
    pool.slice(ups, ups + downs).forEach((u) => rows.set(u.id, -1))
    return [...rows].map(([userId, value]) => ({ userId, value }))
  }

  const insertComments = async (postId: string, list: SeedComment[], after: Date, parentId: string | null = null) => {
    for (const [i, c] of list.entries()) {
      const author = named[c.by]
      const createdAt = new Date(after.getTime() + (i + 1) * 9 * 60000)
      const comment = await prisma.comment.create({
        data: { postId, parentId, authorId: author.id, content: c.text, createdAt },
      })
      await prisma.commentVote.createMany({
        data: voteRows(author.id, c.votes, c.ups, c.downs).map((v) => ({ ...v, commentId: comment.id })),
      })
      if (c.replies) await insertComments(postId, c.replies, createdAt, comment.id)
    }
  }

  for (const p of seedPosts) {
    const author = named[p.by]
    const createdAt = new Date(Date.now() - p.hoursAgo * 3600000)
    const post = await prisma.post.create({
      data: {
        authorId: author.id,
        subredditId: subBySlug.get(p.sub)!.id,
        title: p.title,
        body: p.body,
        imageUrl: p.image ?? null,
        createdAt,
      },
    })
    await prisma.postVote.createMany({
      data: voteRows(author.id, p.votes, p.ups, p.downs).map((v) => ({ ...v, postId: post.id })),
    })
    await insertComments(post.id, p.comments ?? [], createdAt)
  }

  // Scores, up/down counts and karma are all derived from the vote rows above.
  await recountVotes()

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
