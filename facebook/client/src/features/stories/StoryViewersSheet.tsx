import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Loader2, MessageCircle, X } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { REACTION_EMOJI } from '@/lib/constants'
import { shortAge, type StoryViewer } from './stories'

/** Author-only bottom sheet listing who viewed a story, with their reaction. */
export function StoryViewersSheet({ storyId, onClose }: { storyId: string; onClose: () => void }) {
  const token = useAuthStore((s) => s.accessToken)
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['story-viewers', storyId],
    queryFn: () => api<{ count: number; reactionCount: number; viewers: StoryViewer[] }>(`/stories/${storyId}/viewers`, { headers: authHeaders(token) }),
  })
  return (
    <div className="absolute inset-x-0 bottom-0 z-30 max-h-[70%] flex flex-col rounded-t-2xl bg-fb-card text-fb-text shadow-2xl" role="dialog" aria-label="Story viewers">
      <div className="flex items-center justify-between border-b border-fb-border px-4 py-3">
        <div>
          <p className="font-bold">Story details</p>
          {data && (
            <p className="text-xs text-fb-muted">
              {data.count} {data.count === 1 ? 'viewer' : 'viewers'} · {data.reactionCount} {data.reactionCount === 1 ? 'reaction' : 'reactions'}
            </p>
          )}
        </div>
        <button onClick={onClose} aria-label="Close viewers" className="rounded-full bg-[#e4e6eb] p-1.5 hover:bg-[#d8dadf]"><X size={18} /></button>
      </div>
      <div className="overflow-y-auto">
        {isLoading && <div className="flex justify-center py-8 text-fb-muted"><Loader2 className="animate-spin" /></div>}
        {isError && (
          <div className="py-8 text-center text-sm text-fb-muted">
            Couldn&apos;t load viewers. <button onClick={() => refetch()} className="text-fb-primary font-semibold">Retry</button>
          </div>
        )}
        {data?.count === 0 && (
          <p className="px-6 py-8 text-center text-sm text-fb-muted">No viewers yet. When people view your story, you&apos;ll see them here.</p>
        )}
        {data?.viewers.map((v) => (
          <Link key={v.user.id} to={`/profile/${v.user.username}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#f0f2f5]">
            <span className="relative shrink-0">
              <img src={v.user.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
              {v.reaction && (
                <span className="absolute -bottom-1 -right-1 text-base leading-none" aria-label={`Reacted ${v.reaction.toLowerCase()}`}>{REACTION_EMOJI[v.reaction]}</span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{v.user.firstName} {v.user.lastName}</span>
              <span className="flex items-center gap-1 text-xs text-fb-muted">
                {shortAge(v.viewedAt)}
                {v.replied && <><span>·</span><MessageCircle size={12} /> Replied</>}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
