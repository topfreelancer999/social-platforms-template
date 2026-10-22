import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { BottomNav } from '@/components/layout/BottomNav'
import { SoundRow } from '@/features/sounds/SoundRow'
import type { Sound } from '@/features/sounds/types'
import { useAudioPreview } from '@/features/sounds/useAudioPreview'
import { useSoundSearch } from '@/features/sounds/useSounds'

export function DiscoverPage() {
  const token = useAuthStore((s) => s.accessToken)
  const [q, setQ] = useState('')
  const [submitted, setSubmitted] = useState('')
  const { data: trending } = useQuery({
    queryKey: ['trending-tags'],
    queryFn: () => api<{ tag: string; count: number }[]>('/trending/hashtags'),
  })
  const { data } = useQuery({
    queryKey: ['search', submitted],
    queryFn: () => api<Record<string, unknown>>(`/search?q=${encodeURIComponent(submitted)}`, { headers: authHeaders(token) }),
    enabled: submitted.length > 0,
  })
  const trendingSounds = useSoundSearch('', 6)
  const preview = useAudioPreview()
  const soundResults = Array.isArray(data?.sounds) ? (data.sounds as Sound[]) : []
  const soundList = (sounds: Sound[]) =>
    sounds.map((s) => (
      <SoundRow
        key={s.id}
        sound={s}
        playing={preview.playingId === s.id}
        failed={preview.failedId === s.id}
        onTogglePreview={() => preview.toggle(s.id, s.audioUrl)}
      />
    ))
  return (
    <div className="h-[100dvh] overflow-y-auto bg-black text-white pb-20 px-4 pt-4">
      <audio {...preview.audioProps} />
      <form
        onSubmit={(e) => { e.preventDefault(); setSubmitted(q) }}
        className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 mb-6"
      >
        <Search size={18} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users, sounds, #tags" className="flex-1 bg-transparent outline-none text-sm" />
      </form>
      <h2 className="font-bold mb-3">Trending hashtags</h2>
      <div className="flex flex-wrap gap-2 mb-6">
        {trending?.map((h) => (
          <Link key={h.tag} to={`/hashtag/${h.tag}`} className="px-3 py-1.5 bg-white/10 rounded-full text-sm">
            #{h.tag}
          </Link>
        ))}
      </div>
      {Array.isArray(data?.users) && (data.users as { username: string; firstName: string }[]).length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm text-tt-muted mb-2">Users</h3>
          {(data.users as { username: string; firstName: string }[]).map((u) => (
            <Link key={u.username} to={`/@${u.username}`} className="block py-2">@{u.username} — {u.firstName}</Link>
          ))}
        </div>
      )}
      {soundResults.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm text-tt-muted mb-1">Sounds</h3>
          {soundList(soundResults)}
        </div>
      )}
      <h2 className="font-bold mb-1">Trending sounds</h2>
      {trendingSounds.isPending ? (
        <div className="space-y-3 py-2">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-md bg-white/5" />
          ))}
        </div>
      ) : trendingSounds.isError ? (
        <p className="py-2 text-sm text-tt-muted">Couldn&apos;t load sounds.</p>
      ) : trendingSounds.data.length === 0 ? (
        <p className="py-2 text-sm text-tt-muted">No sounds yet.</p>
      ) : (
        <div className="mb-6">{soundList(trendingSounds.data)}</div>
      )}
      <BottomNav active="discover" />
    </div>
  )
}
