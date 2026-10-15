import { useQuery, useMutation } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

type StoriesRes = {
  stories: { user: { username: string }; snaps: { id: string; imageUrl: string; caption: string }[] }[]
}

export function StoryViewerPage() {
  const { username } = useParams<{ username: string }>()
  const token = useAuthStore((s) => s.accessToken)
  const { data } = useQuery({
    queryKey: ['stories'],
    queryFn: () => api<StoriesRes>('/snaps/stories', { headers: authHeaders(token!) }),
    enabled: !!token,
  })
  const group = data?.stories.find((s) => s.user.username === username)
  const snaps = group?.snaps ?? []

  const view = useMutation({
    mutationFn: (snapId: string) =>
      api(`/snaps/${snapId}/view`, { method: 'POST', headers: authHeaders(token), body: '{}' }),
  })

  if (!group) {
    return (
      <div className="p-8 text-center">
        <p>No active story</p>
        <Link to="/" className="mt-4 text-[var(--sc-yellow)]">
          Back
        </Link>
      </div>
    )
  }

  const snap = snaps[0]
  if (!snap) return null

  if (!view.isSuccess && !view.isPending) view.mutate(snap.id)

  return (
    <div className="relative min-h-[80vh] bg-black">
      <img src={snap.imageUrl} alt="" className="h-[85vh] w-full object-cover" />
      <div className="sc-gradient absolute inset-0 flex flex-col justify-between p-4">
        <Link to="/" className="text-sm text-white/80">
          ← Close
        </Link>
        <div>
          <p className="font-bold">@{username}</p>
          {snap.caption && <p className="mt-1">{snap.caption}</p>}
        </div>
      </div>
    </div>
  )
}
