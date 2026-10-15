import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'

export const feedbackRouter = Router()
feedbackRouter.use(requireAuth)

feedbackRouter.post('/', async (req: AuthRequest, res) => {
  const { category, message, rating } = req.body as {
    category: string
    message: string
    rating?: number
  }
  const fb = await prisma.feedback.create({
    data: {
      userId: req.userId!,
      category: category ?? 'other',
      message,
      rating,
    },
  })
  res.status(201).json(fb)
})
