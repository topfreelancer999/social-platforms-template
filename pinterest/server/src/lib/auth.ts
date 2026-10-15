import jwt, { type SignOptions } from 'jsonwebtoken'
import { config } from '../config.js'

const accessSignOptions: SignOptions = { expiresIn: config.accessExpires as SignOptions['expiresIn'] }
const refreshSignOptions: SignOptions = { expiresIn: config.refreshExpires as SignOptions['expiresIn'] }

export interface TokenPayload {
  userId: string
  type: 'access' | 'refresh'
  tokenId?: string
}

export function signAccessToken(userId: string) {
  return jwt.sign({ userId, type: 'access' } satisfies TokenPayload, config.jwtAccessSecret, accessSignOptions)
}

export function signRefreshToken(userId: string, tokenId: string) {
  return jwt.sign(
    { userId, type: 'refresh', tokenId } satisfies TokenPayload,
    config.jwtRefreshSecret,
    refreshSignOptions,
  )
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtAccessSecret) as TokenPayload
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtRefreshSecret) as TokenPayload
}
