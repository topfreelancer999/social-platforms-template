export interface TweetAuthor {
  id: string
  username: string
  firstName: string
  lastName: string
  avatarUrl: string
  verified?: boolean
}

export interface QuotedTweet {
  id: string
  content: string
  imageUrl: string | null
  createdAt: string
  author: TweetAuthor
}

export interface Tweet {
  id: string
  content: string
  imageUrl: string | null
  replyToId: string | null
  quoteTweetId: string | null
  isQuote?: boolean
  communityId: string | null
  createdAt: string
  author: TweetAuthor
  quoteTweet: QuotedTweet | null
  /** Post was a quote, but the original was deleted or is hidden. */
  quoteUnavailable?: boolean
  likeCount: number
  retweetCount: number
  quoteCount?: number
  replyCount: number
  liked: boolean
  retweeted: boolean
  /** Timeline entry id (`t:<id>` or `rt:<repostId>`); present on timelines. */
  entryId?: string
  /** Set when this timeline entry is someone's repost. */
  repostedBy?: TweetAuthor | null
}

export interface TimelinePage {
  items: Tweet[]
  page: number
  hasMore: boolean
  total?: number
}
