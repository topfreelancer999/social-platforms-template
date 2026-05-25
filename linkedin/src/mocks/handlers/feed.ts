import { http, HttpResponse } from 'msw'
import { PAGE_SIZE } from '@/lib/constants'
import type { Post, ReactionType } from '@/types'
import { generateId, getDb, requireUserId, setDb, toPublicUser } from '../db'

function enrichPost(post: Post, db: ReturnType<typeof getDb>) {
  const author = db.users.find((u) => u.id === post.authorId)
  const comments = db.comments.filter((c) => post.commentIds.includes(c.id))
  const repost = post.repostOfId
    ? db.posts.find((p) => p.id === post.repostOfId)
    : undefined
  return {
    ...post,
    author: author ? toPublicUser(author) : null,
    comments: comments.map((c) => ({
      ...c,
      author: toPublicUser(db.users.find((u) => u.id === c.authorId)!),
    })),
    repost: repost
      ? { ...repost, author: toPublicUser(db.users.find((u) => u.id === repost.authorId)!) }
      : undefined,
    reactionSummary: post.reactions.reduce(
      (acc, r) => {
        acc[r.type] = (acc[r.type] ?? 0) + 1
        return acc
      },
      {} as Record<string, number>,
    ),
    totalReactions: post.reactions.length,
  }
}

export const feedHandlers = [
  http.get('/api/feed', ({ request }) => {
    const userId = requireUserId(request.headers)
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? 1)
    const filter = url.searchParams.get('filter') ?? 'recent'
    const db = getDb()
    let posts = [...db.posts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    if (userId && filter === 'network') {
      const user = db.users.find((u) => u.id === userId)
      const networkIds = new Set([...(user?.connectionIds ?? []), ...(user?.followingIds ?? [])])
      posts = posts.filter((p) => networkIds.has(p.authorId) || p.authorId === userId)
    } else if (userId && filter === 'following') {
      const user = db.users.find((u) => u.id === userId)
      const following = new Set(user?.followingIds ?? [])
      posts = posts.filter((p) => following.has(p.authorId))
    }
    const start = (page - 1) * PAGE_SIZE
    const slice = posts.slice(start, start + PAGE_SIZE)
    return HttpResponse.json({
      items: slice.map((p) => enrichPost(p, db)),
      page,
      total: posts.length,
      hasMore: start + PAGE_SIZE < posts.length,
    })
  }),

  http.post('/api/posts', async ({ request }) => {
    const userId = requireUserId(request.headers)
    if (!userId) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const body = (await request.json()) as Partial<Post>
    const post: Post = {
      id: generateId('p'),
      authorId: userId,
      content: body.content ?? '',
      imageUrl: body.imageUrl,
      articleUrl: body.articleUrl,
      articleTitle: body.articleTitle,
      visibility: body.visibility ?? 'anyone',
      createdAt: new Date().toISOString(),
      reactions: [],
      commentIds: [],
      companyId: body.companyId,
      groupId: body.groupId,
    }
    setDb((d) => d.posts.unshift(post))
    return HttpResponse.json(enrichPost(post, getDb()))
  }),

  http.post('/api/posts/:id/react', async ({ params, request }) => {
    const userId = requireUserId(request.headers)
    if (!userId) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const { type } = (await request.json()) as { type: ReactionType }
    const postId = params.id as string
    setDb((d) => {
      const post = d.posts.find((p) => p.id === postId)
      if (!post) return
      const existing = post.reactions.findIndex((r) => r.userId === userId)
      if (existing >= 0) {
        if (post.reactions[existing].type === type) {
          post.reactions.splice(existing, 1)
        } else {
          post.reactions[existing].type = type
        }
      } else {
        post.reactions.push({ userId, type })
      }
    })
    const post = getDb().posts.find((p) => p.id === postId)!
    return HttpResponse.json(enrichPost(post, getDb()))
  }),

  http.post('/api/posts/:id/comments', async ({ params, request }) => {
    const userId = requireUserId(request.headers)
    if (!userId) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const { content } = (await request.json()) as { content: string }
    const postId = params.id as string
    const comment = {
      id: generateId('cm'),
      postId,
      authorId: userId,
      content,
      createdAt: new Date().toISOString(),
    }
    setDb((d) => {
      d.comments.push(comment)
      const post = d.posts.find((p) => p.id === postId)
      if (post) post.commentIds.push(comment.id)
    })
    const db = getDb()
    return HttpResponse.json({
      ...comment,
      author: toPublicUser(db.users.find((u) => u.id === userId)!),
    })
  }),

  http.post('/api/posts/:id/repost', ({ params, request }) => {
    const userId = requireUserId(request.headers)
    if (!userId) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const original = getDb().posts.find((p) => p.id === params.id)
    if (!original) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const post: Post = {
      id: generateId('p'),
      authorId: userId,
      content: '',
      visibility: 'anyone',
      createdAt: new Date().toISOString(),
      reactions: [],
      commentIds: [],
      repostOfId: original.id,
    }
    setDb((d) => d.posts.unshift(post))
    return HttpResponse.json(enrichPost(post, getDb()))
  }),
]
