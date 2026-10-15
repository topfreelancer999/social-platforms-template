import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'

export const contactsRouter = Router()
contactsRouter.use(requireAuth)

contactsRouter.get('/', async (req: AuthRequest, res) => {
  const users = await prisma.user.findMany({
    where: { id: { not: req.userId! } },
    orderBy: { displayName: 'asc' },
    take: 100,
  })
  res.json({ contacts: users.map(toPublicUser) })
})
