export const DEMO_EMAIL = 'demo@youtube.local'
export const DEMO_PASSWORD = 'password'

export const CATEGORIES = ['All', 'Education', 'Entertainment', 'Music', 'Science', 'Gaming'] as const

export const SAMPLE_VIDEO_URL =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'

export const REACTIONS = ['LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY'] as const
export const REACTION_EMOJI: Record<string, string> = {
  LIKE: '👍',
  LOVE: '❤️',
  HAHA: '😂',
  WOW: '😮',
  SAD: '😢',
  ANGRY: '😠',
}
