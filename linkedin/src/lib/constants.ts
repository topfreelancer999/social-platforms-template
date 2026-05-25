export const API_BASE = '/api'
export const DEMO_EMAIL = 'demo@linkedin.local'
export const DEMO_PASSWORD = 'password'
export const PAGE_SIZE = 10
export const SPONSORED_EVERY_N = 4

export const REACTION_TYPES = [
  'like',
  'celebrate',
  'support',
  'love',
  'insightful',
  'funny',
] as const

export const REACTION_LABELS: Record<(typeof REACTION_TYPES)[number], string> = {
  like: 'Like',
  celebrate: 'Celebrate',
  support: 'Support',
  love: 'Love',
  insightful: 'Insightful',
  funny: 'Funny',
}
