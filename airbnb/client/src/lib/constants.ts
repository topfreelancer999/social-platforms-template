export const APP_NAME = 'airbnb'
export const DEMO_EMAIL = 'demo@airbnb.local'
export const DEMO_PASSWORD = 'password'

export const CATEGORIES = [
  { id: 'HOME', label: 'Homes' },
  { id: 'EXPERIENCE', label: 'Experiences' },
  { id: 'SERVICE', label: 'Services' },
] as const

export const REACTIONS = ['LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY'] as const
export const REACTION_EMOJI: Record<string, string> = {
  LIKE: '👍',
  LOVE: '❤️',
  HAHA: '😂',
  WOW: '😮',
  SAD: '😢',
  ANGRY: '😠',
}
