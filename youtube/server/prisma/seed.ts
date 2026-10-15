import { GroupPrivacy, NotificationType, PostPrivacy } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma.js'

const pw = await bcrypt.hash('password', 10)

const SAMPLE_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
]

const titles = [
  'Learn React in 30 Minutes — Full Course',
  'Building a REST API with Node.js',
  'Top 10 Travel Destinations 2026',
  'Guitar Tutorial: Beginner Chords',
  'Science Explained: Black Holes',
  'Cooking the Perfect Pasta',
  'Fitness at Home — 20 Min Workout',
  'Photography Tips for Beginners',
]

async function main() {
  await prisma.report.deleteMany()
  await prisma.feedback.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.message.deleteMany()
  await prisma.threadParticipant.deleteMany()
  await prisma.thread.deleteMany()
  await prisma.playlistItem.deleteMany()
  await prisma.playlist.deleteMany()
  await prisma.videoLike.deleteMany()
  await prisma.videoComment.deleteMany()
  await prisma.video.deleteMany()
  await prisma.subscription.deleteMany()
  await prisma.share.deleteMany()
  await prisma.reaction.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.post.deleteMany()
  await prisma.review.deleteMany()
  await prisma.groupMember.deleteMany()
  await prisma.group.deleteMany()
  await prisma.userSettings.deleteMany()
  await prisma.user.deleteMany()
  await prisma.page.deleteMany()
  await prisma.event.deleteMany()

  const users = [
    { email: 'demo@youtube.local', username: 'tech-academy', channelName: 'Tech Academy', firstName: 'Alex', lastName: 'Morgan', bio: 'Tutorials & reviews', verified: true },
    { email: 'sarah.k@email.com', username: 'sarah-vlogs', channelName: 'Sarah Vlogs', firstName: 'Sarah', lastName: 'Kim', bio: 'Daily vlogs' },
    { email: 'mike.j@email.com', username: 'mike-gaming', channelName: 'Mike Plays', firstName: 'Mike', lastName: 'Jones', bio: 'Gaming & streams' },
    { email: 'emma.w@email.com', username: 'emma-cooks', channelName: 'Emma Cooks', firstName: 'Emma', lastName: 'Wilson', bio: 'Recipes & food' },
    { email: 'david.l@email.com', username: 'david-music', channelName: 'David Music', firstName: 'David', lastName: 'Lee', bio: 'Music lessons', verified: true },
  ]

  const created = []
  for (let i = 0; i < users.length; i++) {
    const u = users[i]
    const user = await prisma.user.create({
      data: {
        ...u,
        passwordHash: pw,
        avatarUrl: `https://i.pravatar.cc/150?img=${i + 1}`,
        coverUrl: `https://picsum.photos/seed/yt${i}/1280/300`,
        settings: { create: {} },
      },
    })
    created.push(user)
  }

  const [alex, sarah, mike, emma, david] = created

  for (const [sub, ch] of [[mike, alex], [mike, sarah], [emma, alex], [david, sarah], [alex, emma]] as const) {
    await prisma.subscription.create({ data: { subscriberId: sub.id, channelId: ch.id } })
  }

  const videoIds = []
  for (let i = 0; i < 16; i++) {
    const author = created[i % created.length]
    const video = await prisma.video.create({
      data: {
        authorId: author.id,
        title: titles[i % titles.length],
        description: `In this video we explore ${titles[i % titles.length].toLowerCase()}. Subscribe for more!`,
        videoUrl: SAMPLE_VIDEOS[i % SAMPLE_VIDEOS.length],
        thumbnailUrl: `https://picsum.photos/seed/vid${i}/640/360`,
        category: ['Education', 'Entertainment', 'Music', 'Science'][i % 4],
        duration: 120 + i * 30,
        viewCount: 5000 + i * 2000,
        createdAt: new Date(Date.now() - i * 86400000),
      },
    })
    videoIds.push(video.id)
    if (i < 8) {
      await prisma.videoLike.create({ data: { videoId: video.id, userId: mike.id } })
      await prisma.videoComment.create({
        data: { videoId: video.id, userId: sarah.id, content: 'Great video, thanks!' },
      })
    }
  }

  const playlist = await prisma.playlist.create({
    data: {
      userId: mike.id,
      title: 'Watch later',
      items: { create: [{ videoId: videoIds[0], position: 0 }, { videoId: videoIds[1], position: 1 }] },
    },
  })

  for (let i = 0; i < 8; i++) {
    await prisma.post.create({
      data: {
        authorId: created[i % created.length].id,
        content: ['Community post: new series coming!', 'Poll: what should I film next?', 'Behind the scenes today'][i % 3],
        privacy: PostPrivacy.PUBLIC,
      },
    })
  }

  const group = await prisma.group.create({
    data: {
      name: 'Creator Collective',
      description: 'YouTube creators supporting each other',
      imageUrl: 'https://picsum.photos/seed/ytg/200',
      privacy: GroupPrivacy.PUBLIC,
      creatorId: alex.id,
      members: { create: [{ userId: alex.id }, { userId: sarah.id }, { userId: mike.id }] },
    },
  })
  await prisma.post.create({
    data: { authorId: sarah.id, content: 'Welcome to Creator Collective!', groupId: group.id, privacy: PostPrivacy.PUBLIC },
  })

  const page = await prisma.page.create({
    data: { slug: 'tube-tools', name: 'TubeTools Pro', category: 'Software', description: 'Editing software for creators', imageUrl: 'https://picsum.photos/seed/p1/100', coverUrl: 'https://picsum.photos/seed/pc1/1200/400' },
  })
  await prisma.review.create({ data: { pageId: page.id, userId: emma.id, rating: 5, content: 'Best editor for beginners!' } })

  const thread = await prisma.thread.create({
    data: { participants: { create: [{ userId: alex.id, unread: 0 }, { userId: mike.id, unread: 1 }] } },
  })
  await prisma.message.createMany({
    data: [
      { threadId: thread.id, senderId: mike.id, content: 'Love your React tutorial!', createdAt: new Date(Date.now() - 3600000) },
      { threadId: thread.id, senderId: alex.id, content: 'Thanks for watching!', createdAt: new Date(Date.now() - 1800000) },
    ],
  })

  await prisma.notification.createMany({
    data: [
      { userId: alex.id, actorId: mike.id, type: NotificationType.SUBSCRIBE, title: 'New subscriber', body: 'Mike subscribed', link: '/channel/tech-academy' },
      { userId: alex.id, actorId: mike.id, type: NotificationType.VIDEO_COMMENT, title: 'New comment', body: 'On your React video', link: `/watch/${videoIds[0]}` },
    ],
  })

  await prisma.event.create({
    data: { title: 'Creator Summit Live', date: new Date(Date.now() + 10 * 86400000), location: 'Online', imageUrl: 'https://picsum.photos/seed/yte/400/200', attendeeIds: [alex.id] },
  })

  console.log('Seed complete. Demo: demo@youtube.local / password')
  void playlist
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
