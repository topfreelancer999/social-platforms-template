import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/auth.js'
import { toPublicUser } from '../lib/user.js'
import { getRefreshUserId, revokeRefreshToken, storeRefreshToken } from '../lib/redis.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'

const REFRESH_TTL = 7 * 24 * 60 * 60

export const authRouter = Router()

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
})

function setTokens(res: import('express').Response, userId: string) {
  const tokenId = randomUUID()
  const accessToken = signAccessToken(userId)
  const refreshToken = signRefreshToken(userId, tokenId)
  storeRefreshToken(tokenId, userId, REFRESH_TTL)
  res.cookie('accessToken', accessToken, { httpOnly: true, sameSite: 'lax', maxAge: 15 * 60 * 1000 })
  res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'lax', maxAge: REFRESH_TTL * 1000 })
  return { accessToken, refreshToken, tokenId }
}

authRouter.post('/register', async (req, res) => {
  const body = registerSchema.safeParse(req.body)
  if (!body.success) return res.status(400).json({ message: body.error.message })
  const exists = await prisma.user.findUnique({ where: { email: body.data.email } })
  if (exists) return res.status(400).json({ message: 'Email already registered' })
  const username = `${body.data.firstName}-${body.data.lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
  const id = randomUUID().slice(0, 8)
  const user = await prisma.user.create({
    data: {
      email: body.data.email,
      passwordHash: await bcrypt.hash(body.data.password, 10),
      username: `${username}-${id}`,
      displayName: `${body.data.firstName} ${body.data.lastName}`,
      phone: '',
      firstName: body.data.firstName,
      lastName: body.data.lastName,
      avatarUrl: `https://i.pravatar.cc/150?u=${id}`,
      coverUrl: `https://picsum.photos/seed/fb${id}/1200/400`,
      settings: { create: {} },
    },
  })
  const tokens = setTokens(res, user.id)
  res.json({ ...tokens, user: toPublicUser(user) })
})

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body as { email: string; password: string }
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid email or password' })
  }
  const tokens = setTokens(res, user.id)
  res.json({ ...tokens, user: toPublicUser(user) })
})

authRouter.post('/refresh', async (req, res) => {
  const token = req.cookies?.refreshToken ?? req.body?.refreshToken
  if (!token) return res.status(401).json({ message: 'No refresh token' })
  try {
    const payload = verifyRefreshToken(token)
    if (payload.type !== 'refresh' || !payload.tokenId) throw new Error('invalid')
    const userId = await getRefreshUserId(payload.tokenId)
    if (!userId || userId !== payload.userId) throw new Error('invalid')
    await revokeRefreshToken(payload.tokenId)
    const tokens = setTokens(res, userId)
    res.json(tokens)
  } catch {
    res.status(401).json({ message: 'Invalid refresh token' })
  }
})

authRouter.post('/logout', async (req, res) => {
  const token = req.cookies?.refreshToken
  if (token) {
    try {
      const payload = verifyRefreshToken(token)
      if (payload.tokenId) await revokeRefreshToken(payload.tokenId)
    } catch {
      /* ignore */
    }
  }
  res.clearCookie('accessToken')
  res.clearCookie('refreshToken')
  res.json({ ok: true })
})

authRouter.post('/forgot-password', (_req, res) => {
  res.json({ message: 'Reset link sent (mock)' })
})

authRouter.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } })
  if (!user) return res.status(401).json({ message: 'Unauthorized' })
  res.json(toPublicUser(user))
})
