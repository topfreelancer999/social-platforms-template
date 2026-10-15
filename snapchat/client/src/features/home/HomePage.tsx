import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, authHeaders } from '@/lib/api'
import { Avatar } from '@/components/ui/Avatar'
import { useAuthStore } from '@/stores/authStore'

type StoryGroup = {
  user: { id: string; username: string; avatarUrl: string; displayName?: string }
  hasUnviewed: boolean
  snaps: { id: string; imageUrl: string; caption: string }[]
}

export function HomePage() {
  const me = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.accessToken)
  const { data, isLoading } = useQuery({
    queryKey: ['stories'],
    queryFn: () => api<{ stories: StoryGroup[] }>('/snaps/stories', { headers: authHeaders(token!) }),
    enabled: !!token,
  })

  const stories = data?.stories ?? []

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Stories</h1>

      {isLoading && <p className="text-white/60">Loading stories…</p>}

      <div className="mb-6 flex gap-4 overflow-x-auto pb-2">
        <Link to="/camera" className="flex shrink-0 flex-col items-center gap-1">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-white/40 bg-white/10">
            <span className="text-2xl">+</span>
          </div>
          <span className="text-xs">My Story</span>
        </Link>
        {stories.map((g) => (
          <Link
            key={g.user.id}
            to={`/story/${g.user.username}`}
            className="flex shrink-0 flex-col items-center gap-1"
          >
            <div className={g.hasUnviewed ? 'story-ring' : 'story-ring-viewed'}>
              <Avatar src={g.user.avatarUrl} alt={g.user.username} size="lg" className="border-2 border-black" />
            </div>
            <span className="max-w-[72px] truncate text-xs">
              {g.user.id === me?.id ? 'Your Story' : g.user.displayName || g.user.username}
            </span>
          </Link>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-[var(--sc-yellow)]">Spotlight</h2>
        <SpotlightPreview />
      </section>

      <div className="mt-6 grid gap-2 text-sm text-white/60">
        <Link to="/discover" className="rounded-xl bg-white/10 px-4 py-3 hover:bg-white/15">
          Discover channels & Spotlight →
        </Link>
        <Link to="/groups" className="rounded-xl bg-white/10 px-4 py-3 hover:bg-white/15">
          Join groups →
        </Link>
        <Link to="/feedback" className="rounded-xl bg-white/10 px-4 py-3 hover:bg-white/15">
          Send feedback →
        </Link>
      </div>
    </div>
  )
}

function SpotlightPreview() {
  const token = useAuthStore((s) => s.accessToken)
  const { data } = useQuery({
    queryKey: ['spotlight'],
    queryFn: () =>
      api<{ items: { id: string; imageUrl: string; caption: string; author: { username: string } }[] }>(
        '/snaps/spotlight',
        { headers: authHeaders(token!) },
      ),
    enabled: !!token,
  })
  const items = data?.items?.slice(0, 4) ?? []
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((s) => (
        <div key={s.id} className="relative aspect-[9/16] overflow-hidden rounded-xl bg-zinc-900">
          <img src={s.imageUrl} alt="" className="h-full w-full object-cover" />
          <div className="sc-gradient absolute inset-0 flex flex-col justify-end p-2">
            <p className="text-xs font-medium">@{s.author.username}</p>
            {s.caption && <p className="text-xs text-white/80">{s.caption}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}
