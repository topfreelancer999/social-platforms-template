export const DEMO_EMAIL = 'demo@discord.local'
export const DEMO_PASSWORD = 'password'

export const REACTIONS = ['LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY'] as const
export const REACTION_EMOJI: Record<string, string> = {
  LIKE: '👍',
  LOVE: '❤️',
  HAHA: '😂',
  WOW: '😮',
  SAD: '😢',
  ANGRY: '😠',
}

export const STATUS_COLORS: Record<string, string> = {
  online: 'bg-dc-green',
  idle: 'bg-yellow-500',
  dnd: 'bg-red-500',
  offline: 'bg-dc-muted',
}
