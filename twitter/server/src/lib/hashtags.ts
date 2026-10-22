import type { Prisma } from '@prisma/client'
import { prisma } from './prisma.js'

const TAG_RE = /#([a-zA-Z0-9_]{1,50})/g

export function extractHashtags(content: string): string[] {
  const tags = new Set<string>()
  for (const m of content.matchAll(TAG_RE)) tags.add(m[1].toLowerCase())
  return [...tags]
}

/** Pass `db` to link inside an interactive transaction. */
export async function linkHashtags(tweetId: string, content: string, db: Prisma.TransactionClient = prisma) {
  const tags = extractHashtags(content)
  for (const tag of tags) {
    const hashtag = await db.hashtag.upsert({
      where: { tag },
      create: { tag },
      update: {},
    })
    await db.tweetHashtag.upsert({
      where: { tweetId_hashtagId: { tweetId, hashtagId: hashtag.id } },
      create: { tweetId, hashtagId: hashtag.id },
      update: {},
    })
  }
}
