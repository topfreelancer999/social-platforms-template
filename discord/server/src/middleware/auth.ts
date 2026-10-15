import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../lib/auth.js'

export interface AuthRequest extends Request {
  userId?: string
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.accessToken
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' })
  }
  try {
    const payload = verifyAccessToken(token)
    if (payload.type !== 'access') throw new Error('invalid')
    req.userId = payload.userId
    next()
  } catch {
    return res.status(401).json({ message: 'Unauthorized' })
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.accessToken
  if (token) {
    try {
      const payload = verifyAccessToken(token)
      if (payload.type === 'access') req.userId = payload.userId
    } catch {
      /* ignore */
    }
  }
  next()
}
