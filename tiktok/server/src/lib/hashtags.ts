import { prisma } from './prisma.js'

const TAG_RE = /#([a-zA-Z0-9_]{1,50})/g

export function extractHashtags(text: string): string[] {
  const tags = new Set<string>()
  for (const m of text.matchAll(TAG_RE)) tags.add(m[1].toLowerCase())
  return [...tags]
}

export async function linkHashtags(videoId: string, caption: string) {
  for (const tag of extractHashtags(caption)) {
    const hashtag = await prisma.hashtag.upsert({
      where: { tag },
      create: { tag },
      update: {},
    })
    await prisma.videoHashtag.upsert({
      where: { videoId_hashtagId: { videoId, hashtagId: hashtag.id } },
      create: { videoId, hashtagId: hashtag.id },
      update: {},
    })
  }
}
