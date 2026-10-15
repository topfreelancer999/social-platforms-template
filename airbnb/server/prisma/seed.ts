import { BookingStatus, FriendshipStatus, GroupPrivacy, ListingType, NotificationType, PostPrivacy, ReactionType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma.js'

const pw = await bcrypt.hash('password', 10)

const cities = [
  { city: 'Austin', country: 'USA', lat: 30.27, lng: -97.74 },
  { city: 'Barcelona', country: 'Spain', lat: 41.39, lng: 2.17 },
  { city: 'Tokyo', country: 'Japan', lat: 35.68, lng: 139.69 },
  { city: 'Paris', country: 'France', lat: 48.86, lng: 2.35 },
  { city: 'Bali', country: 'Indonesia', lat: -8.34, lng: 115.09 },
]

async function main() {
  await prisma.report.deleteMany()
  await prisma.feedback.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.hostReview.deleteMany()
  await prisma.message.deleteMany()
  await prisma.threadParticipant.deleteMany()
  await prisma.thread.deleteMany()
  await prisma.wishlistItem.deleteMany()
  await prisma.wishlist.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.review.deleteMany()
  await prisma.share.deleteMany()
  await prisma.reaction.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.post.deleteMany()
  await prisma.listing.deleteMany()
  await prisma.groupMember.deleteMany()
  await prisma.group.deleteMany()
  await prisma.block.deleteMany()
  await prisma.friendship.deleteMany()
  await prisma.userSettings.deleteMany()
  await prisma.user.deleteMany()
  await prisma.page.deleteMany()
  await prisma.event.deleteMany()

  const users = [
    { email: 'demo@airbnb.local', username: 'alex-morgan', firstName: 'Alex', lastName: 'Morgan', bio: 'Host & traveler', isHost: true, superhost: true },
    { email: 'sarah.k@email.com', username: 'sarah-kim', firstName: 'Sarah', lastName: 'Kim', bio: 'Designer', isHost: true },
    { email: 'mike.j@email.com', username: 'mike-jones', firstName: 'Mike', lastName: 'Jones', bio: 'Explorer', isHost: false },
    { email: 'emma.w@email.com', username: 'emma-wilson', firstName: 'Emma', lastName: 'Wilson', bio: 'Family trips', isHost: true },
    { email: 'david.l@email.com', username: 'david-lee', firstName: 'David', lastName: 'Lee', bio: 'Remote worker', isHost: false },
  ]

  const createdUsers = []
  for (let i = 0; i < users.length; i++) {
    const u = users[i]
    const user = await prisma.user.create({
      data: {
        ...u,
        passwordHash: pw,
        location: cities[i % cities.length].city,
        avatarUrl: `https://i.pravatar.cc/150?img=${i + 1}`,
        coverUrl: `https://picsum.photos/seed/ab${i}/1200/400`,
        settings: { create: {} },
        wishlists: { create: { name: 'Favorites' } },
      },
    })
    createdUsers.push(user)
  }

  const [alex, sarah, mike, emma, david] = createdUsers

  for (const [a, b] of [[alex, sarah], [alex, mike], [alex, emma], [sarah, emma], [mike, david]] as const) {
    await prisma.friendship.create({
      data: { senderId: a.id, receiverId: b.id, status: FriendshipStatus.ACCEPTED },
    })
  }

  const listingTitles = [
    'Cozy downtown loft with skyline views',
    'Beachfront villa steps from the sand',
    'Modern studio near the metro',
    'Charming cottage in the hills',
    'Luxury penthouse with pool',
    'Rustic cabin by the lake',
    'Bright apartment for remote work',
    'Historic home in the old quarter',
  ]

  const listings = []
  for (let i = 0; i < 12; i++) {
    const host = createdUsers[i % 3]
    const loc = cities[i % cities.length]
    const listing = await prisma.listing.create({
      data: {
        hostId: host.id,
        title: listingTitles[i % listingTitles.length],
        description: 'A wonderful place to stay with great amenities and a welcoming host.',
        type: i % 5 === 0 ? ListingType.EXPERIENCE : ListingType.HOME,
        pricePerNight: 80 + i * 25,
        city: loc.city,
        country: loc.country,
        lat: loc.lat,
        lng: loc.lng,
        maxGuests: 2 + (i % 4),
        bedrooms: 1 + (i % 3),
        beds: 1 + (i % 2),
        baths: 1 + (i % 2) * 0.5,
        photos: [
          `https://picsum.photos/seed/l${i}a/800/600`,
          `https://picsum.photos/seed/l${i}b/800/600`,
        ],
        amenities: ['Wifi', 'Kitchen', 'Washer', 'Air conditioning', 'Free parking'].slice(0, 3 + (i % 3)),
      },
    })
    listings.push(listing)
    if (i < 6) {
      await prisma.review.create({
        data: {
          listingId: listing.id,
          userId: mike.id,
          rating: 4 + (i % 2),
          content: 'Amazing stay! Would book again.',
        },
      })
    }
  }

  const featured = listings[0]
  await prisma.booking.create({
    data: {
      listingId: featured.id,
      guestId: mike.id,
      checkIn: new Date(Date.now() + 14 * 86400000),
      checkOut: new Date(Date.now() + 17 * 86400000),
      guests: 2,
      totalPrice: featured.pricePerNight * 3,
      status: BookingStatus.CONFIRMED,
    },
  })

  await prisma.wishlistItem.create({
    data: {
      wishlistId: (await prisma.wishlist.findFirst({ where: { userId: alex.id } }))!.id,
      listingId: listings[1].id,
    },
  })

  for (let i = 0; i < 15; i++) {
    const author = createdUsers[i % createdUsers.length]
    await prisma.post.create({
      data: {
        authorId: author.id,
        content: ['Just hosted wonderful guests!', 'Travel tip: book early for summer.', 'New listing photos uploaded!'][i % 3],
        imageUrl: i % 2 === 0 ? `https://picsum.photos/seed/post${i}/600/400` : null,
        privacy: PostPrivacy.PUBLIC,
        listingId: i % 3 === 0 ? listings[i % listings.length].id : null,
        createdAt: new Date(Date.now() - i * 3600000),
      },
    })
  }

  const group = await prisma.group.create({
    data: {
      name: 'Digital Nomads',
      description: 'Remote work travel tips',
      imageUrl: 'https://picsum.photos/seed/g1/200',
      privacy: GroupPrivacy.PUBLIC,
      creatorId: alex.id,
      members: { create: [{ userId: alex.id }, { userId: sarah.id }, { userId: david.id }] },
    },
  })
  await prisma.post.create({
    data: { authorId: sarah.id, content: 'Best cities for nomads in 2026?', groupId: group.id, privacy: PostPrivacy.PUBLIC },
  })

  const pages = await Promise.all([
    prisma.page.create({ data: { slug: 'cleanpro', name: 'CleanPro Partners', category: 'Cleaning', description: 'Professional cleaning', imageUrl: 'https://picsum.photos/seed/p1/100', coverUrl: 'https://picsum.photos/seed/pc1/1200/400' } }),
    prisma.page.create({ data: { slug: 'stay-insured', name: 'StayInsured', category: 'Insurance', description: 'Travel protection', imageUrl: 'https://picsum.photos/seed/p2/100', coverUrl: 'https://picsum.photos/seed/pc2/1200/400' } }),
  ])
  for (const page of pages) {
    await prisma.review.create({ data: { pageId: page.id, userId: emma.id, rating: 5, content: 'Great service!' } })
  }

  const thread = await prisma.thread.create({
    data: { participants: { create: [{ userId: alex.id, unread: 0 }, { userId: mike.id, unread: 1 }] } },
  })
  await prisma.message.createMany({
    data: [
      { threadId: thread.id, senderId: mike.id, content: 'Hi! Is your place available next weekend?', createdAt: new Date(Date.now() - 3600000) },
      { threadId: thread.id, senderId: alex.id, content: 'Yes, you can book directly!', createdAt: new Date(Date.now() - 1800000) },
    ],
  })

  await prisma.notification.createMany({
    data: [
      { userId: alex.id, actorId: mike.id, type: NotificationType.BOOKING_REQUEST, title: 'New booking', body: 'Mike booked your listing', link: '/host' },
      { userId: mike.id, actorId: alex.id, type: NotificationType.MESSAGE, title: 'Message from Alex', body: 'Yes, you can book directly!', link: '/messages' },
    ],
  })

  await prisma.event.createMany({
    data: [
      { title: 'Sunset kayak tour', date: new Date(Date.now() + 10 * 86400000), location: 'Austin, TX', imageUrl: 'https://picsum.photos/seed/ev1/400/200', attendeeIds: [mike.id] },
      { title: 'Wine tasting walk', date: new Date(Date.now() + 20 * 86400000), location: 'Barcelona', imageUrl: 'https://picsum.photos/seed/ev2/400/200', attendeeIds: [] },
    ],
  })

  console.log('Seed complete. Demo: demo@airbnb.local / password')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
