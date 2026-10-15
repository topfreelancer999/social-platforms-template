import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

type StoryGroup = {
  user: { username: string; avatarUrl: string; displayName?: string; firstName: string }
  items: { id: string; imageUrl: string }[]
}

export function StoriesBar() {
  const token = useAuthStore((s) => s.accessToken)
  const me = useAuthStore((s) => s.user)
  const { data } = useQuery({
    queryKey: ['stories'],
    queryFn: () => api<{ stories: StoryGroup[] }>('/stories', { headers: authHeaders(token!) }),
    enabled: !!token,
  })

  return (
    <div className="flex gap-4 overflow-x-auto py-4 px-4 border-b border-ig-border scrollbar-hide">
      {me && (
        <Link to="/create/story" className="flex flex-col items-center gap-1 shrink-0 w-16">
          <div className="relative w-16 h-16 rounded-full border border-ig-border flex items-center justify-center overflow-hidden">
            <img src={me.avatarUrl} alt="" className="w-full h-full object-cover opacity-80" />
            <span className="absolute bottom-0 right-0 bg-ig-blue text-white rounded-full w-5 h-5 text-lg leading-5 text-center">+</span>
          </div>
          <span className="text-xs truncate w-full text-center">Your story</span>
        </Link>
      )}
      {data?.stories.map((s) => (
        <Link key={s.user.username} to={`/stories/${s.user.username}`} className="flex flex-col items-center gap-1 shrink-0 w-16">
          <div className="ig-story-ring rounded-full">
            <img src={s.user.avatarUrl} alt="" className="w-[60px] h-[60px] rounded-full border-2 border-ig-bg object-cover" />
          </div>
          <span className="text-xs truncate w-full text-center">{s.user.displayName || s.user.firstName}</span>
        </Link>
      ))}
    </div>
  )
}
