import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'

export const eventsRouter = Router()

eventsRouter.get('/', async (_req, res) => {
  const events = await prisma.event.findMany({ orderBy: { date: 'asc' } })
  res.json(events)
})

eventsRouter.post('/:id/rsvp', requireAuth, async (req: AuthRequest, res) => {
  const event = await prisma.event.findUnique({ where: { id: param(req, 'id') } })
  if (!event) return res.status(404).json({ message: 'Not found' })
  const uid = req.userId!
  const attendeeIds = Array.isArray(event.attendeeIds) ? (event.attendeeIds as string[]) : []
  if (!attendeeIds.includes(uid)) {
    await prisma.event.update({
      where: { id: event.id },
      data: { attendeeIds: [...attendeeIds, uid] },
    })
  }
  res.json({ ok: true })
})
