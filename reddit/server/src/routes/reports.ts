import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'

export const reportsRouter = Router()
reportsRouter.use(requireAuth)

reportsRouter.post('/', async (req: AuthRequest, res) => {
  const { targetType, targetId, reason } = req.body as {
    targetType: string
    targetId: string
    reason: string
  }
  const report = await prisma.report.create({
    data: {
      reporterId: req.userId!,
      targetType,
      targetId,
      reason: reason ?? 'inappropriate',
    },
  })
  res.status(201).json(report)
})
