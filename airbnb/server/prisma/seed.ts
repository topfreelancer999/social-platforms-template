import { BookingStatus, FriendshipStatus, GroupPrivacy, ListingType, NotificationType, PostPrivacy, ReactionType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma.js'

const pw = await bcrypt.hash('password', 10)

/** UTC midnight `offset` days from today — the same day keys the availability API speaks. */
function day(offset: number) {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset))
}

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
  await prisma.blockedNight.deleteMany()
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

  // Stays across the calendar so hosts see reservations and guests see taken nights right away.
  // Alex (the demo user) hosts listings 0, 3, 6, 9; Sarah hosts 1, 4, 7, 10; Mike hosts 2, 5, 8, 11.
  const stays: { listing: number; guest: typeof alex; from: number; to: number; guests: number; status?: BookingStatus }[] = [
    { listing: 0, guest: david, from: 2, to: 5, guests: 1 },
    { listing: 0, guest: mike, from: 14, to: 17, guests: 2 },
    { listing: 0, guest: emma, from: 24, to: 29, guests: 3 },
    { listing: 0, guest: sarah, from: 41, to: 44, guests: 2 },
    { listing: 0, guest: mike, from: -12, to: -9, guests: 2, status: BookingStatus.COMPLETED },
    { listing: 3, guest: emma, from: 6, to: 9, guests: 2 },
    { listing: 3, guest: david, from: 19, to: 23, guests: 1 },
    { listing: 1, guest: alex, from: 20, to: 23, guests: 2 },
    { listing: 1, guest: mike, from: 5, to: 9, guests: 2 },
    { listing: 1, guest: david, from: 30, to: 34, guests: 1 },
    { listing: 2, guest: emma, from: 3, to: 7, guests: 2 },
    { listing: 2, guest: david, from: 15, to: 18, guests: 1 },
    { listing: 4, guest: david, from: 9, to: 13, guests: 2 },
    { listing: 4, guest: alex, from: 45, to: 49, guests: 2 },
    { listing: 5, guest: emma, from: 11, to: 16, guests: 3 },
  ]
  for (const stay of stays) {
    const listing = listings[stay.listing]
    await prisma.booking.create({
      data: {
        listingId: listing.id,
        guestId: stay.guest.id,
        checkIn: day(stay.from),
        checkOut: day(stay.to),
        guests: stay.guests,
        totalPrice: listing.pricePerNight * (stay.to - stay.from),
        status: stay.status ?? BookingStatus.CONFIRMED,
        createdAt: day(Math.min(stay.from, 0) - 7),
      },
    })
  }

  // Host-blocked nights (range is [from, to) like a stay).
  const blocks: { listing: number; from: number; to: number; note: string }[] = [
    { listing: 0, from: 8, to: 11, note: 'Deep clean & repairs' },
    { listing: 0, from: 33, to: 36, note: 'Family visiting' },
    { listing: 3, from: 12, to: 15, note: 'Painting the bedroom' },
    { listing: 1, from: 12, to: 15, note: 'Owner stay' },
    { listing: 2, from: 22, to: 26, note: '' },
    { listing: 4, from: 1, to: 4, note: 'Maintenance' },
  ]
  for (const block of blocks) {
    await prisma.blockedNight.createMany({
      data: Array.from({ length: block.to - block.from }, (_, i) => ({
        listingId: listings[block.listing].id,
        date: day(block.from + i),
        note: block.note,
      })),
    })
  }

  // A couple of stay-length rules so the picker's min/max hints have something to show.
  await prisma.listing.update({ where: { id: listings[1].id }, data: { minNights: 2 } })
  await prisma.listing.update({ where: { id: listings[4].id }, data: { minNights: 3, maxNights: 14 } })

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
