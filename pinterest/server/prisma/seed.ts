import { GroupPrivacy, NotificationType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma.js'
import { clearPinFiles, newStorageKey, publicUrl, saveFile } from '../src/lib/storage.js'
import { SEED_IMAGES, renderPng } from './seedImages.js'

const pw = await bcrypt.hash('password', 10)

async function main() {
  await prisma.report.deleteMany()
  await prisma.feedback.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.pinComment.deleteMany()
  await prisma.pinSave.deleteMany()
  await prisma.pin.deleteMany()
  await prisma.pinUpload.deleteMany()
  await clearPinFiles()
  await prisma.board.deleteMany()
  await prisma.userFollow.deleteMany()
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
    { email: 'demo@pinterest.local', username: 'alex_pins', displayName: 'Alex Morgan', firstName: 'Alex', lastName: 'Morgan' },
    { email: 'sarah.k@email.com', username: 'sarah_k', displayName: 'Sarah Kim', firstName: 'Sarah', lastName: 'Kim' },
    { email: 'mike.j@email.com', username: 'mike_diy', displayName: 'Mike DIY', firstName: 'Mike', lastName: 'Jones' },
    { email: 'emma.w@email.com', username: 'emma_art', displayName: 'Emma Art', firstName: 'Emma', lastName: 'Wilson' },
    { email: 'david.l@email.com', username: 'david_home', displayName: 'David Home', firstName: 'David', lastName: 'Lee' },
  ]

  const created = []
  for (let i = 0; i < users.length; i++) {
    const u = users[i]
    const user = await prisma.user.create({
      data: {
        ...u,
        passwordHash: pw,
        bio: 'Pinning ideas for life & work',
        website: i === 0 ? 'https://example.com' : '',
        avatarUrl: `https://i.pravatar.cc/150?img=${i + 1}`,
        settings: { create: {} },
      },
    })
    created.push(user)
  }

  const [alex, sarah, mike, emma, david] = created

  for (const u of created) {
    await prisma.board.createMany({
      data: [
        { userId: u.id, name: 'Ideas', description: 'Inspiration', coverUrl: `https://picsum.photos/seed/b${u.username}1/400/300` },
        { userId: u.id, name: 'Recipes', description: 'Food & drink', coverUrl: `https://picsum.photos/seed/b${u.username}2/400/300` },
        { userId: u.id, name: 'Home', description: 'Decor & DIY', coverUrl: `https://picsum.photos/seed/b${u.username}3/400/300` },
      ],
    })
  }

  const boards = await prisma.board.findMany()
  const titles = [
    'Modern living room mood board',
    'Easy weeknight pasta',
    'Minimal desk setup',
    'Garden patio inspiration',
    'Wedding color palette',
    'Capsule wardrobe essentials',
    'Bathroom remodel ideas',
    'Healthy meal prep',
    'Gallery wall layout',
    'Small kitchen storage hacks',
    'Travel packing list',
    'Birthday party decor',
  ]

  for (let i = 0; i < 24; i++) {
    const author = created[i % created.length]
    const board = boards.find((b) => b.userId === author.id)!
    const height = 300 + (i % 4) * 80
    await prisma.pin.create({
      data: {
        authorId: author.id,
        boardId: board.id,
        title: titles[i % titles.length],
        description: 'Save for later · #inspiration',
        imageUrl: `https://picsum.photos/seed/pin${i}/400/${height}`,
        imageWidth: 400,
        imageHeight: height,
        linkUrl: i % 3 === 0 ? 'https://example.com' : null,
        createdAt: new Date(Date.now() - i * 7200000),
      },
    })
  }

  // Pins whose images live in local upload storage (generated, so seeding works offline).
  const uploaders = [alex, alex, alex, alex, sarah, emma]
  for (let i = 0; i < SEED_IMAGES.length; i++) {
    const image = SEED_IMAGES[i]
    const author = uploaders[i]
    const { data, dominantColor } = renderPng(image)
    const storageKey = newStorageKey('png')
    await saveFile(storageKey, data)
    const upload = await prisma.pinUpload.create({
      data: { userId: author.id, storageKey, mimeType: 'image/png', bytes: data.length, width: image.width, height: image.height },
    })
    const board = boards.find((b) => b.userId === author.id && b.name === (i % 2 ? 'Home' : 'Ideas'))!
    await prisma.pin.create({
      data: {
        authorId: author.id,
        boardId: board.id,
        title: image.title,
        description: image.description,
        imageUrl: publicUrl(storageKey),
        imageWidth: image.width,
        imageHeight: image.height,
        dominantColor,
        uploadId: upload.id,
        createdAt: new Date(Date.now() - (i + 1) * 600000),
      },
    })
  }

  const pins = await prisma.pin.findMany({ take: 6, where: { uploadId: null } })
  const alexBoard = boards.find((b) => b.userId === alex.id && b.name === 'Ideas')!
  for (const p of pins.slice(0, 3)) {
    await prisma.pinSave.create({ data: { userId: alex.id, pinId: p.id, boardId: alexBoard.id } })
  }

  await prisma.pinComment.create({
    data: { pinId: pins[0].id, userId: sarah.id, content: 'Love this! Saving to my board.' },
  })

  const followPairs: [string, string][] = [
    [alex.id, sarah.id],
    [alex.id, emma.id],
    [sarah.id, mike.id],
    [mike.id, david.id],
    [emma.id, alex.id],
  ]
  for (const [a, b] of followPairs) {
    await prisma.userFollow.create({ data: { followerId: a, followingId: b } })
  }

  const channels = [
    { slug: 'home-decor', name: 'Home Decor', desc: 'Interior design & DIY' },
    { slug: 'food-drink', name: 'Food & Drink', desc: 'Recipes and entertaining' },
    { slug: 'fashion', name: 'Fashion', desc: 'Style and outfits' },
  ]
  for (let i = 0; i < channels.length; i++) {
    const c = channels[i]
    await prisma.channel.create({
      data: {
        slug: c.slug,
        name: c.name,
        description: c.desc,
        imageUrl: `https://picsum.photos/seed/ch${i}/200/200`,
        ownerId: created[i % created.length].id,
        followers: { create: created.slice(0, 4).map((u) => ({ userId: u.id })) },
        posts: {
          create: [
            { title: 'Trending this week', caption: 'Curated picks', imageUrl: `https://picsum.photos/seed/chp${i}a/400/600` },
            { title: 'Editor picks', caption: 'Must-save pins', imageUrl: `https://picsum.photos/seed/chp${i}b/400/500` },
          ],
        },
      },
    })
  }

  const group = await prisma.group.create({
    data: {
      name: 'Pinterest Creators Hub',
      description: 'Share boards and collaborate',
      imageUrl: 'https://picsum.photos/seed/pigrp/200/200',
      privacy: GroupPrivacy.PUBLIC,
      creatorId: alex.id,
      members: { create: created.map((u) => ({ userId: u.id })) },
    },
  })

  await prisma.page.create({
    data: {
      slug: 'pinterest-business',
      name: 'Pinterest Business',
      category: 'Partner',
      description: 'Ads and analytics for brands',
      imageUrl: 'https://picsum.photos/seed/pipage/120/120',
      coverUrl: 'https://picsum.photos/seed/pipagec/800/200',
      reviews: { create: { userId: david.id, rating: 5, content: 'Great ROI for visual products.' } },
    },
  })

  await prisma.thread.create({
    data: {
      participants: { create: [{ userId: alex.id }, { userId: sarah.id }] },
      messages: {
        create: [
          { senderId: sarah.id, content: 'Saved your pin to my Ideas board!' },
          { senderId: alex.id, content: 'Thanks! Let me know if you want more like that.' },
        ],
      },
    },
  })

  await prisma.notification.create({
    data: {
      userId: alex.id,
      actorId: sarah.id,
      type: NotificationType.PIN_SAVE,
      title: 'Pin saved',
      body: 'Sarah saved your pin',
      link: '/',
    },
  })

  await prisma.event.create({
    data: {
      title: 'Creator Workshop',
      date: new Date(Date.now() + 7 * 86400000),
      location: 'Online',
      imageUrl: 'https://picsum.photos/seed/pievent/400/200',
      attendeeIds: JSON.stringify([alex.id, emma.id]),
    },
  })

  console.log('Seed complete. Demo: demo@pinterest.local / password')
  console.log(`Group: ${group.name}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
