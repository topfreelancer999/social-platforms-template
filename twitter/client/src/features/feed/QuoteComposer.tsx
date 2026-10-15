import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { Avatar } from '@/components/ui/Avatar'
import { QuotedTweetCard } from './QuotedTweetCard'
import { useCreateTweet } from './hooks'
import type { QuotedTweet } from './types'

const MAX = 280

/** Modal composer for a quote post, with a static preview of the quoted post. */
export function QuoteComposer({ quoted, onClose }: { quoted: QuotedTweet; onClose: () => void }) {
  const user = useAuthStore((s) => s.user)
  const [text, setText] = useState('')
  const create = useCreateTweet()
  const remaining = MAX - text.length

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = () => {
    if (!text.trim() || create.isPending) return
    create.mutate({ content: text, quoteTweetId: quoted.id }, { onSuccess: onClose })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 dark:bg-[#5b7083]/40 sm:pt-12"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Quote post"
    >
      <div className="w-full h-full sm:h-auto sm:max-w-[600px] bg-white dark:bg-black sm:rounded-2xl shadow-xl flex flex-col max-h-screen sm:max-h-[90vh]">
        <div className="flex items-center px-2 py-2">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="flex gap-3 px-4 pb-2 overflow-y-auto">
          <Avatar src={user?.avatarUrl} />
          <div className="flex-1 min-w-0">
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX))}
              onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && submit()}
              className="w-full bg-transparent text-xl outline-none resize-none min-h-[96px] placeholder:text-x-muted"
              placeholder="Add a comment"
            />
            <QuotedTweetCard quoted={quoted} interactive={false} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-x-border-light dark:border-x-border px-4 py-3 mt-2">
          {create.isError && <span className="text-sm text-red-500 mr-auto">{create.error.message}</span>}
          <span className={`text-xs ${remaining < 20 ? 'text-orange-500' : 'text-x-muted'}`}>{remaining}</span>
          <button
            onClick={submit}
            disabled={!text.trim() || create.isPending}
            className="bg-x-primary hover:bg-x-primary-hover text-white font-bold rounded-full px-4 py-1.5 text-sm disabled:opacity-50"
          >
            {create.isPending ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  )
}
