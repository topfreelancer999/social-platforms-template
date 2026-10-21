import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import { comparatorFor, type CommentSort, type PostSort } from './ranking.js'

/** Only the viewer's own vote is loaded; totals come from the denormalized columns. */
function postInclude(viewerId: string) {
  return {
    author: true,
    subreddit: true,
    votes: { where: { userId: viewerId }, select: { value: true } },
    _count: { select: { comments: true } },
  } satisfies Prisma.PostInclude
}

type PostRow = Prisma.PostGetPayload<{ include: ReturnType<typeof postInclude> }>

function toPostDto(post: PostRow) {
  return {
    id: post.id,
    title: post.title,
    body: post.body,
    imageUrl: post.imageUrl,
    linkUrl: post.linkUrl,
    createdAt: post.createdAt,
    author: toPublicUser(post.author),
    subreddit: { id: post.subreddit.id, name: post.subreddit.name, slug: post.subreddit.slug, iconUrl: post.subreddit.iconUrl },
    score: post.score,
    upvotes: post.upvotes,
    downvotes: post.downvotes,
    commentCount: post._count.comments,
    myVote: post.votes[0]?.value ?? 0,
  }
}

export type PostDto = ReturnType<typeof toPostDto>

export async function enrichPost(postId: string, viewerId: string) {
  const post = await prisma.post.findUnique({ where: { id: postId }, include: postInclude(viewerId) })
  return post ? toPostDto(post) : null
}

export async function findPosts(
  viewerId: string,
  args: { where?: Prisma.PostWhereInput; orderBy?: Prisma.PostOrderByWithRelationInput[]; take?: number } = {},
) {
  const posts = await prisma.post.findMany({
    where: args.where,
    orderBy: args.orderBy ?? [{ createdAt: 'desc' }],
    take: args.take ?? 50,
    include: postInclude(viewerId),
  })
  return posts.map(toPostDto)
}

/** A feed listing (home or one subreddit) in the requested sort order. */
export async function listPosts(viewerId: string, sort: PostSort, where: Prisma.PostWhereInput = {}, take = 50) {
  switch (sort) {
    case 'new':
      return findPosts(viewerId, { where, take })
    case 'top':
      return findPosts(viewerId, { where, take, orderBy: [{ score: 'desc' }, { createdAt: 'desc' }] })
    default: {
      // Hot/controversial depend on time or the up/down split, so rank a recent window in memory.
      const window = await findPosts(viewerId, { where, take: take * 4 })
      return window.sort(comparatorFor(sort)).slice(0, take)
    }
  }
}

export type EnrichedComment = {
  id: string
  postId: string
  content: string
  parentId: string | null
  createdAt: Date
  author: ReturnType<typeof toPublicUser>
  score: number
  upvotes: number
  downvotes: number
  myVote: number
  replies: EnrichedComment[]
}

/** Whole comment tree for a post in two queries, each level ordered by `sort`. */
export async function getCommentTree(postId: string, viewerId: string, sort: CommentSort = 'best') {
  const rows = await prisma.comment.findMany({
    where: { postId },
    include: { author: true, votes: { where: { userId: viewerId }, select: { value: true } } },
  })
  const byId = new Map<string, EnrichedComment>()
  for (const c of rows) {
    byId.set(c.id, {
      id: c.id,
      postId: c.postId,
      content: c.content,
      parentId: c.parentId,
      createdAt: c.createdAt,
      author: toPublicUser(c.author),
      score: c.score,
      upvotes: c.upvotes,
      downvotes: c.downvotes,
      myVote: c.votes[0]?.value ?? 0,
      replies: [],
    })
  }
  const roots: EnrichedComment[] = []
  for (const c of byId.values()) {
    const parent = c.parentId ? byId.get(c.parentId) : undefined
    if (parent) parent.replies.push(c)
    else roots.push(c)
  }
  const compare = comparatorFor(sort)
  const sortLevel = (list: EnrichedComment[]) => {
    list.sort(compare)
    for (const c of list) sortLevel(c.replies)
  }
  sortLevel(roots)
  return roots
}
