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
  /** Root of the author's thread this post continues; null on roots and lone posts. */
  threadRootId?: string | null
  /** Posts in the thread this post starts (1 when it is not a thread root). */
  threadLength?: number
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

export interface TweetDetail {
  tweet: Tweet
  /** Earlier posts of the author's thread, root first. */
  threadBefore: Tweet[]
  /** The author's thread continuation after this post. */
  threadAfter: Tweet[]
  replies: Tweet[]
}

export interface ThreadResult {
  rootId: string
  items: Tweet[]
}
