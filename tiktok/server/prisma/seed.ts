import { FriendshipStatus, GroupPrivacy, NotificationType, PostPrivacy } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma.js'
import { linkHashtags } from '../src/lib/hashtags.js'

const pw = await bcrypt.hash('password', 10)

const SAMPLE_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
]

const captions = [
  'POV: weekend vibes 🌅 #fyp #viral',
  'Tutorial you needed #learn #tiktok',
  'This trend is everything 😂 #comedy',
  'Travel diaries ✈️ #travel #wanderlust',
  'Recipe in 60 seconds #food #cooking',
  'Dance challenge #dance #fyp',
  'Morning routine that changed my life #lifestyle #fyp',
  'Wait for the ending 😳 #viral #comedy',
  'Leg day, no excuses 💪 #fitness #gym',
  'Hidden gem in Lisbon 🇵🇹 #travel',
]

async function main() {
  await prisma.report.deleteMany()
  await prisma.feedback.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.message.deleteMany()
  await prisma.threadParticipant.deleteMany()
  await prisma.thread.deleteMany()
  await prisma.videoHashtag.deleteMany()
  await prisma.hashtag.deleteMany()
  await prisma.bookmark.deleteMany()
  await prisma.videoLike.deleteMany()
  await prisma.videoComment.deleteMany()
  await prisma.video.deleteMany()
  await prisma.sound.deleteMany()
  await prisma.share.deleteMany()
  await prisma.reaction.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.post.deleteMany()
  await prisma.review.deleteMany()
  await prisma.groupMember.deleteMany()
  await prisma.group.deleteMany()
  await prisma.block.deleteMany()
  await prisma.follow.deleteMany()
  await prisma.friendship.deleteMany()
  await prisma.userSettings.deleteMany()
  await prisma.user.deleteMany()
  await prisma.page.deleteMany()
  await prisma.event.deleteMany()

  const users = [
    { email: 'demo@tiktok.local', username: 'alex-creates', firstName: 'Alex', lastName: 'Morgan', bio: 'Creator · #fyp', verified: true },
    { email: 'sarah.k@email.com', username: 'sarah-dance', firstName: 'Sarah', lastName: 'Kim', bio: 'Dance & lifestyle', verified: true },
    { email: 'mike.j@email.com', username: 'mike-funny', firstName: 'Mike', lastName: 'Jones', bio: 'Comedy skits' },
    { email: 'emma.w@email.com', username: 'emma-travel', firstName: 'Emma', lastName: 'Wilson', bio: 'Travel vlogs' },
    { email: 'david.l@email.com', username: 'david-tech', firstName: 'David', lastName: 'Lee', bio: 'Tech tips' },
    { email: 'nina.c@email.com', username: 'nina-cooks', firstName: 'Nina', lastName: 'Costa', bio: '60-second recipes', verified: true },
    { email: 'leo.f@email.com', username: 'leo-fitness', firstName: 'Leo', lastName: 'Park', bio: 'Daily workouts' },
  ]

  const createdUsers = []
  for (let i = 0; i < users.length; i++) {
    const u = users[i]
    const user = await prisma.user.create({
      data: {
        ...u,
        passwordHash: pw,
        avatarUrl: `https://i.pravatar.cc/150?img=${i + 1}`,
        coverUrl: `https://picsum.photos/seed/tt${i}/1200/400`,
        settings: { create: {} },
      },
    })
    createdUsers.push(user)
  }

  const [alex, sarah, mike, emma, david, nina, leo] = createdUsers

  const sounds = await Promise.all([
    prisma.sound.create({ data: { title: 'Original Sound - Alex', artist: 'alex-creates', audioUrl: '', coverUrl: 'https://picsum.photos/seed/s1/100' } }),
    prisma.sound.create({ data: { title: 'Trending Beat 2026', artist: 'DJ Wave', audioUrl: '', coverUrl: 'https://picsum.photos/seed/s2/100', useCount: 1200 } }),
    prisma.sound.create({ data: { title: 'Viral Dance', artist: 'sarah-dance', audioUrl: '', coverUrl: 'https://picsum.photos/seed/s3/100', useCount: 890 } }),
  ])

  // Demo user (alex) follows sarah, mike and emma -> Following tab; david, nina and leo only reach alex via For You.
  for (const [follower, following] of [
    [mike, alex], [mike, sarah], [emma, alex], [david, sarah], [sarah, alex], [nina, alex], [leo, sarah],
    [alex, sarah], [alex, mike], [alex, emma],
  ] as const) {
    await prisma.follow.create({ data: { followerId: follower.id, followingId: following.id } })
  }

  // 28 videos spread over 7 creators and ~3 days, with varied engagement so the For You ranking has signal.
  const fans = [sarah, mike, emma, david, nina, leo, alex]
  const commentTexts = ['This is fire 🔥', 'Obsessed 😍', 'Need part 2!', 'How did you do that?', 'Saved for later 📌']
  for (let i = 0; i < 28; i++) {
    const author = createdUsers[i % createdUsers.length]
    const engagement = [3, 0, 5, 1, 4, 2, 5, 1][i % 8] // deterministic but uneven
    const video = await prisma.video.create({
      data: {
        authorId: author.id,
        videoUrl: SAMPLE_VIDEOS[i % SAMPLE_VIDEOS.length],
        coverUrl: `https://picsum.photos/seed/v${i}/400/700`,
        caption: captions[i % captions.length],
        soundId: sounds[i % sounds.length].id,
        duration: 15 + (i % 30),
        viewCount: 800 + engagement * 2400 + i * 37,
        shareCount: engagement * 9 + (i % 4),
        createdAt: new Date(Date.now() - i * 2.5 * 3600000),
      },
    })
    await linkHashtags(video.id, video.caption)
    const likers = fans.filter((u) => u.id !== author.id).slice(0, engagement + 1)
    for (const u of likers) {
      await prisma.videoLike.create({ data: { videoId: video.id, userId: u.id } })
    }
    for (const [k, u] of likers.slice(0, Math.ceil(engagement / 2)).entries()) {
      await prisma.videoComment.create({
        data: { videoId: video.id, userId: u.id, content: commentTexts[(i + k) % commentTexts.length] },
      })
    }
    for (const u of likers.slice(0, Math.floor(engagement / 2))) {
      await prisma.bookmark.create({ data: { videoId: video.id, userId: u.id } })
    }
  }

  for (let i = 0; i < 10; i++) {
    await prisma.post.create({
      data: {
        authorId: createdUsers[i % createdUsers.length].id,
        content: ['Channel update!', 'Going live soon', 'Collab open DM'][i % 3],
        privacy: PostPrivacy.PUBLIC,
        createdAt: new Date(Date.now() - i * 3600000),
      },
    })
  }

  const group = await prisma.group.create({
    data: {
      name: 'Creator Hub',
      description: 'Tips and collabs #creators',
      imageUrl: 'https://picsum.photos/seed/g1/200',
      privacy: GroupPrivacy.PUBLIC,
      creatorId: alex.id,
      members: { create: [{ userId: alex.id }, { userId: sarah.id }, { userId: mike.id }] },
    },
  })
  await prisma.post.create({
    data: { authorId: sarah.id, content: 'Welcome to Creator Hub!', groupId: group.id, privacy: PostPrivacy.PUBLIC },
  })

  const pages = await Promise.all([
    prisma.page.create({ data: { slug: 'brand-deals', name: 'BrandDeals Co', category: 'Marketing', description: 'Creator partnerships', imageUrl: 'https://picsum.photos/seed/p1/100', coverUrl: 'https://picsum.photos/seed/pc1/1200/400' } }),
  ])
  await prisma.review.create({ data: { pageId: pages[0].id, userId: emma.id, rating: 5, content: 'Great for creators!' } })

  const thread = await prisma.thread.create({
    data: { participants: { create: [{ userId: alex.id, unread: 0 }, { userId: mike.id, unread: 1 }] } },
  })
  await prisma.message.createMany({
    data: [
      { threadId: thread.id, senderId: mike.id, content: 'Love your latest video!', createdAt: new Date(Date.now() - 3600000) },
      { threadId: thread.id, senderId: alex.id, content: 'Thanks! 🙏', createdAt: new Date(Date.now() - 1800000) },
    ],
  })

  await prisma.notification.createMany({
    data: [
      { userId: alex.id, actorId: mike.id, type: NotificationType.VIDEO_LIKE, title: 'Mike liked your video', body: '', link: '/' },
      { userId: alex.id, actorId: mike.id, type: NotificationType.MESSAGE, title: 'New message', body: 'Love your latest video!', link: '/inbox' },
      { userId: mike.id, actorId: sarah.id, type: NotificationType.FOLLOW, title: 'Sarah followed you', body: '', link: `/@${sarah.username}` },
    ],
  })

  await prisma.event.create({
    data: { title: 'Creator Live Session', date: new Date(Date.now() + 5 * 86400000), location: 'Online', imageUrl: 'https://picsum.photos/seed/ev1/400/200', attendeeIds: [alex.id] },
  })

  console.log('Seed complete. Demo: demo@tiktok.local / password')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
