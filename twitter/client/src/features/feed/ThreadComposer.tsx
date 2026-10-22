import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { Avatar } from '@/components/ui/Avatar'
import { useCreateThread, useCreateTweet, useExtendThread } from './hooks'

const MAX = 280
const MAX_POSTS = 25
const RING_R = 9
const RING_C = 2 * Math.PI * RING_R

interface Draft {
  key: string
  text: string
  /** Focus on mount; set for posts added with "+". */
  focus?: boolean
}

/** X-style progress ring with the remaining character count. */
function CharCounter({ length }: { length: number }) {
  const remaining = MAX - length
  const color = remaining <= 0 ? '#f4212e' : remaining <= 20 ? '#ffd400' : '#1d9bf0'
  return (
    <span className="flex items-center gap-1.5 text-xs tabular-nums" aria-label={`${remaining} characters remaining`}>
      <span className={remaining <= 0 ? 'text-red-500' : remaining <= 20 ? 'text-orange-500' : 'text-x-muted'}>{remaining}</span>
      <svg width="22" height="22" viewBox="0 0 22 22" className="-rotate-90" aria-hidden>
        <circle cx="11" cy="11" r={RING_R} fill="none" strokeWidth="2" className="stroke-x-border-light dark:stroke-x-border" />
        <circle
          cx="11"
          cy="11"
          r={RING_R}
          fill="none"
          strokeWidth="2"
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={RING_C}
          strokeDashoffset={RING_C * (1 - Math.min(1, length / MAX))}
        />
      </svg>
    </span>
  )
}

/**
 * Composer that grows into a thread: "+" adds a post (each with its own
 * counter), posts are joined by a line between avatars, and "Post all"
 * publishes them in one request. With `extendId` it appends to that post's
 * thread instead ("Add another post").
 */
export function ThreadComposer({
  extendId,
  autoFocus = false,
  onPosted,
  onCancel,
}: {
  extendId?: string
  autoFocus?: boolean
  onPosted?: () => void
  onCancel?: () => void
}) {
  const user = useAuthStore((s) => s.user)
  const [drafts, setDrafts] = useState<Draft[]>([{ key: 'post-0', text: '' }])
  const [error, setError] = useState<string | null>(null)
  const createTweet = useCreateTweet()
  const createThread = useCreateThread()
  const extend = useExtendThread()
  const pending = createTweet.isPending || createThread.isPending || extend.isPending

  const isThread = drafts.length > 1
  const canPost = !pending && drafts.every((d) => d.text.trim().length > 0)
  const canAdd = !pending && drafts.length < MAX_POSTS && drafts[drafts.length - 1].text.trim().length > 0

  const update = (key: string, text: string) =>
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, text: text.slice(0, MAX) } : d)))
  const add = () => setDrafts((ds) => [...ds, { key: crypto.randomUUID(), text: '', focus: true }])
  const remove = (key: string) => setDrafts((ds) => (ds.length > 1 ? ds.filter((d) => d.key !== key) : ds))

  const done = () => {
    setDrafts([{ key: crypto.randomUUID(), text: '' }])
    setError(null)
    onPosted?.()
  }
  const fail = (e: Error) => setError(e.message)

  const submit = () => {
    if (!canPost) return
    setError(null)
    const posts = drafts.map((d) => ({ content: d.text }))
    if (extendId) extend.mutate({ id: extendId, posts }, { onSuccess: done, onError: fail })
    else if (isThread) createThread.mutate({ posts }, { onSuccess: done, onError: fail })
    else createTweet.mutate({ content: posts[0].content }, { onSuccess: done, onError: fail })
  }

  return (
    <div>
      {drafts.map((d, i) => {
        const hasNext = i < drafts.length - 1
        return (
          <div key={d.key} className="flex gap-3">
            <div className="flex flex-col items-center shrink-0">
              <Avatar src={user?.avatarUrl} />
              {hasNext && <div className="w-0.5 grow mt-1 bg-[#cfd9de] dark:bg-[#333639]" aria-hidden />}
            </div>
            <div className={`flex-1 min-w-0 ${hasNext ? 'pb-4' : ''}`}>
              <div className="flex items-start gap-1">
                <textarea
                  autoFocus={d.focus || (i === 0 && autoFocus)}
                  value={d.text}
                  onChange={(e) => update(d.key, e.target.value)}
                  onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && submit()}
                  aria-label={isThread ? `Post ${i + 1} of ${drafts.length}` : 'Post text'}
                  placeholder={i === 0 && !extendId ? 'What is happening?!' : 'Add another post'}
                  className="flex-1 min-w-0 bg-transparent text-lg sm:text-xl outline-none resize-none [field-sizing:content] min-h-[52px] pt-1.5 placeholder:text-x-muted break-words"
                />
                {isThread && (
                  <button
                    onClick={() => remove(d.key)}
                    aria-label={`Remove post ${i + 1}`}
                    className="p-1.5 mt-0.5 rounded-full text-x-primary hover:bg-x-primary/10 shrink-0"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              {(isThread || d.text.length > 0) && (
                <div className="flex justify-end mt-1">
                  <CharCounter length={d.text.length} />
                </div>
              )}
            </div>
          </div>
        )
      })}
      <div className="flex items-center justify-end gap-3 ml-[52px] mt-2 pt-3 border-t border-x-border-light dark:border-x-border">
        {error && (
          <span role="alert" className="text-sm text-red-500 mr-auto">
            {error}
          </span>
        )}
        {onCancel && (
          <button
            onClick={onCancel}
            className="rounded-full px-4 py-1.5 text-sm font-bold border border-x-border-light dark:border-x-border hover:bg-black/5 dark:hover:bg-white/10"
          >
            Cancel
          </button>
        )}
        <button
          onClick={add}
          disabled={!canAdd}
          aria-label="Add another post"
          title="Add another post"
          className="h-8 w-8 shrink-0 rounded-full border border-x-border-light dark:border-x-border text-x-primary flex items-center justify-center hover:bg-x-primary/10 disabled:opacity-50 disabled:hover:bg-transparent"
        >
          <Plus size={18} />
        </button>
        <button
          onClick={submit}
          disabled={!canPost}
          className="bg-x-primary hover:bg-x-primary-hover text-white font-bold rounded-full px-4 py-1.5 text-sm disabled:opacity-50 shrink-0"
        >
          {pending ? 'Posting…' : isThread ? 'Post all' : 'Post'}
        </button>
      </div>
    </div>
  )
}
