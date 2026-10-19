import { ChannelType, GroupPrivacy, NotificationType, PostPrivacy, ServerRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma.js'
import { DEFAULT_EVERYONE_PERMISSIONS, Permissions as P } from '../src/lib/permissions.js'

const pw = await bcrypt.hash('password', 10)

async function main() {
  await prisma.report.deleteMany()
  await prisma.feedback.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.channelMessage.deleteMany()
  await prisma.channelPermissionOverwrite.deleteMany()
  await prisma.memberRole.deleteMany()
  await prisma.role.deleteMany()
  await prisma.channel.deleteMany()
  await prisma.serverMember.deleteMany()
  await prisma.server.deleteMany()
  await prisma.message.deleteMany()
  await prisma.threadParticipant.deleteMany()
  await prisma.thread.deleteMany()
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
    { email: 'demo@discord.local', username: 'alex-dev', displayName: 'Alex Dev', firstName: 'Alex', lastName: 'Morgan', bio: 'Full-stack dev', verified: true },
    { email: 'sarah.k@email.com', username: 'sarah-k', displayName: 'Sarah K', firstName: 'Sarah', lastName: 'Kim', bio: 'Designer' },
    { email: 'mike.j@email.com', username: 'mike-gamer', displayName: 'Mike Gamer', firstName: 'Mike', lastName: 'Jones', bio: 'Gaming nights' },
    { email: 'emma.w@email.com', username: 'emma-w', displayName: 'Emma W', firstName: 'Emma', lastName: 'Wilson', bio: 'Music & art' },
    { email: 'david.l@email.com', username: 'david-l', displayName: 'David L', firstName: 'David', lastName: 'Lee', bio: 'Open source', verified: true },
  ]

  const created = []
  for (let i = 0; i < users.length; i++) {
    const u = users[i]
    const user = await prisma.user.create({
      data: {
        ...u,
        passwordHash: pw,
        avatarUrl: `https://i.pravatar.cc/150?img=${i + 1}`,
        coverUrl: `https://picsum.photos/seed/dc${i}/1280/300`,
        settings: { create: {} },
      },
    })
    created.push(user)
  }

  const [alex, sarah, mike, emma, david] = created

  const servers = [
    { name: 'Dev Hub', desc: 'Code, ship, repeat', icon: 'https://picsum.photos/seed/s1/96/96', owner: alex },
    { name: 'Gaming Lounge', desc: 'LFG & voice nights', icon: 'https://picsum.photos/seed/s2/96/96', owner: mike },
    { name: 'Design Collective', desc: 'UI/UX feedback', icon: 'https://picsum.photos/seed/s3/96/96', owner: sarah },
  ]

  const serverRecords = []
  for (const s of servers) {
    const server = await prisma.server.create({
      data: {
        name: s.name,
        description: s.desc,
        iconUrl: s.icon,
        ownerId: s.owner.id,
        members: {
          create: [
            { userId: s.owner.id, role: ServerRole.OWNER },
            ...created.filter((u) => u.id !== s.owner.id).map((u) => ({ userId: u.id, role: ServerRole.MEMBER })),
          ],
        },
        roles: {
          create: {
            name: '@everyone',
            position: 0,
            isEveryone: true,
            permissions: DEFAULT_EVERYONE_PERMISSIONS.toString(),
          },
        },
        channels: {
          create: [
            { name: 'general', topic: 'General chat', type: ChannelType.TEXT, position: 0 },
            { name: 'announcements', topic: 'News', type: ChannelType.ANNOUNCEMENT, position: 1 },
            { name: 'random', topic: 'Off-topic', type: ChannelType.TEXT, position: 2 },
            { name: 'voice-lobby', topic: 'Voice', type: ChannelType.VOICE, position: 3 },
          ],
        },
      },
      include: { channels: true, roles: true, members: true },
    })
    // #announcements is read-only for @everyone on every server.
    await prisma.channelPermissionOverwrite.create({
      data: {
        channelId: server.channels.find((c) => c.name === 'announcements')!.id,
        roleId: server.roles[0].id,
        deny: P.SEND_MESSAGES.toString(),
      },
    })
    serverRecords.push(server)
  }

  // Dev Hub gets a full role hierarchy. Alex (demo) owns it; Sarah moderates with
  // Manage Roles but sits below Admin; Mike is a plain Member with limited access.
  const devHub = serverRecords[0]
  const memberOf = (userId: string) => devHub.members.find((m) => m.userId === userId)!.id
  const everyone = devHub.roles[0]
  const roleDefs = [
    { name: 'Admin', color: 0xe74c3c, hoist: true, mentionable: true, permissions: P.ADMINISTRATOR, users: [david] },
    {
      name: 'Moderator',
      color: 0x3498db,
      hoist: true,
      mentionable: true,
      permissions:
        P.KICK_MEMBERS | P.MANAGE_MESSAGES | P.MANAGE_ROLES | P.MANAGE_NICKNAMES | P.MENTION_EVERYONE |
        P.VIEW_AUDIT_LOG | P.MUTE_MEMBERS,
      users: [sarah],
    },
    { name: 'Contributor', color: 0x9b59b6, hoist: false, mentionable: false, permissions: P.EMBED_LINKS | P.ATTACH_FILES, users: [emma] },
    { name: 'Member', color: 0x2ecc71, hoist: true, mentionable: false, permissions: 0n, users: [sarah, mike, emma] },
  ]
  const devRoles: Record<string, string> = {}
  for (let i = 0; i < roleDefs.length; i++) {
    const def = roleDefs[i]
    const role = await prisma.role.create({
      data: {
        serverId: devHub.id,
        name: def.name,
        color: def.color,
        hoist: def.hoist,
        mentionable: def.mentionable,
        permissions: def.permissions.toString(),
        position: roleDefs.length - i,
        members: { create: def.users.map((u) => ({ memberId: memberOf(u.id) })) },
      },
    })
    devRoles[def.name] = role.id
  }

  const devAnnouncements = devHub.channels.find((c) => c.name === 'announcements')!
  const modChat = await prisma.channel.create({
    data: {
      serverId: devHub.id,
      name: 'mod-chat',
      topic: 'Private channel for the moderation team',
      position: 3,
      overwrites: {
        create: [
          { roleId: everyone.id, deny: P.VIEW_CHANNEL.toString() },
          { roleId: devRoles.Moderator, allow: P.VIEW_CHANNEL.toString() },
        ],
      },
    },
  })
  await prisma.channel.updateMany({ where: { serverId: devHub.id, name: 'voice-lobby' }, data: { position: 4 } })
  // Moderators may post announcements even though @everyone cannot.
  await prisma.channelPermissionOverwrite.create({
    data: { channelId: devAnnouncements.id, roleId: devRoles.Moderator, allow: P.SEND_MESSAGES.toString() },
  })
  const devMessages = [
    { channelId: devAnnouncements.id, authorId: alex.id, content: 'Welcome to Dev Hub! This channel is read-only — only staff can post here.' },
    { channelId: devAnnouncements.id, authorId: sarah.id, content: 'Reminder: be kind, ship often, and keep #general on topic.' },
    { channelId: modChat.id, authorId: sarah.id, content: 'Mod sync: anyone seen spam in #random today?' },
    { channelId: modChat.id, authorId: david.id, content: 'All quiet. I tightened the Member role permissions.' },
  ]
  for (let i = 0; i < devMessages.length; i++) {
    await prisma.channelMessage.create({
      data: { ...devMessages[i], createdAt: new Date(Date.now() - (devMessages.length - i) * 900000) },
    })
  }

  const welcome = [
    'Welcome to the server! 👋',
    'Anyone up for a session tonight?',
    'Check pinned messages for rules.',
    'Just shipped a new feature 🚀',
    'Great work on the last sprint!',
  ]

  for (const server of serverRecords) {
    const general = server.channels.find((c) => c.name === 'general')!
    for (let i = 0; i < welcome.length; i++) {
      await prisma.channelMessage.create({
        data: {
          channelId: general.id,
          authorId: created[i % created.length].id,
          content: welcome[i],
          createdAt: new Date(Date.now() - (welcome.length - i) * 600000),
        },
      })
    }
  }

  const group = await prisma.group.create({
    data: {
      name: 'Discord Clone Builders',
      description: 'Building social apps together',
      imageUrl: 'https://picsum.photos/seed/grp/200/200',
      privacy: GroupPrivacy.PUBLIC,
      creatorId: alex.id,
      members: { create: created.map((u) => ({ userId: u.id })) },
    },
  })

  await prisma.post.create({
    data: {
      authorId: alex.id,
      content: 'Our Discord clone is live — join Dev Hub!',
      privacy: PostPrivacy.PUBLIC,
      groupId: group.id,
    },
  })

  await prisma.page.create({
    data: {
      slug: 'nitro-partner',
      name: 'Nitro Partner',
      category: 'Product',
      description: 'Official partner perks',
      imageUrl: 'https://picsum.photos/seed/page/120/120',
      coverUrl: 'https://picsum.photos/seed/pagec/800/200',
      reviews: {
        create: { userId: mike.id, rating: 5, content: 'Great support and perks!' },
      },
    },
  })

  const thread = await prisma.thread.create({
    data: {
      participants: { create: [{ userId: alex.id }, { userId: sarah.id }] },
      messages: {
        create: [
          { senderId: sarah.id, content: 'Hey Alex, saw your message in #general' },
          { senderId: alex.id, content: 'Thanks! Want to pair on the API?' },
        ],
      },
    },
  })
  await prisma.threadParticipant.updateMany({
    where: { threadId: thread.id },
    data: { unread: 0 },
  })

  await prisma.notification.create({
    data: {
      userId: mike.id,
      actorId: alex.id,
      type: NotificationType.CHANNEL_MESSAGE,
      title: 'New message in #general',
      body: 'Alex: Our Discord clone is live',
      link: `/servers/${serverRecords[0].id}`,
    },
  })

  await prisma.event.create({
    data: {
      title: 'Community Game Night',
      date: new Date(Date.now() + 7 * 86400000),
      location: 'Gaming Lounge voice',
      imageUrl: 'https://picsum.photos/seed/ev/400/200',
      attendeeIds: JSON.stringify([mike.id, emma.id]),
    },
  })

  console.log('Seed complete. Demo: demo@discord.local / password (also sarah.k@email.com, mike.j@email.com)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
