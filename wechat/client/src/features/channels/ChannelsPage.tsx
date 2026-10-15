import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

type Channel = { id: string; slug: string; name: string; description: string; imageUrl: string; followerCount: number }

export function ChannelsPage() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['channels'],
    queryFn: () => api<{ channels: Channel[] }>('/channels', { headers: authHeaders(token!) }),
    enabled: !!token,
  })

  const follow = useMutation({
    mutationFn: (slug: string) => api(`/channels/${slug}/follow`, { method: 'POST', headers: authHeaders(token!) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['channels'] }),
  })

  return (
    <div className="h-full flex flex-col bg-wx-header">
      <header className="h-14 px-4 flex items-center">
        <h1 className="text-lg font-medium">Official Accounts</h1>
      </header>
      <p className="px-4 text-sm text-wx-muted mb-2">公众号 — follow for updates</p>
      <div className="flex-1 overflow-y-auto">
        {data?.channels.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3 border-b border-wx-border/40">
            <Link to={`/channels/${c.slug}`} className="flex items-center gap-3 flex-1 min-w-0">
              <img src={c.imageUrl} alt="" className="w-12 h-12 rounded-full" />
              <div className="min-w-0">
                <p className="font-medium truncate">{c.name}</p>
                <p className="text-sm text-wx-muted truncate">{c.description}</p>
                <p className="text-xs text-wx-muted">{c.followerCount} followers</p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => follow.mutate(c.slug)}
              className="text-sm text-wx-green font-medium shrink-0"
            >
              Follow
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
