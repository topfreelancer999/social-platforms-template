import { Link } from 'react-router-dom'
import { Camera } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { MomentCard } from './MomentCard'
import { useMomentsFeed } from './api'

export function MomentsPage() {
  const me = useAuthStore((s) => s.user)
  const { data, isLoading, isError, refetch } = useMomentsFeed()

  return (
    <div className="h-full flex flex-col bg-wx-bg">
      <header className="h-11 flex items-center justify-center bg-wx-panel border-b border-wx-border shrink-0 relative">
        <Link to="/discover" className="absolute left-3 text-wx-text text-sm">←</Link>
        <h1 className="font-medium">Moments</h1>
        <Link to="/moments/post" className="absolute right-3 text-wx-text" aria-label="Post a Moment">
          <Camera size={22} />
        </Link>
      </header>
      <div className="flex-1 overflow-y-auto">
        {me && (
          <div className="relative mb-10">
            <img src={me.coverUrl} alt="" className="w-full h-40 object-cover" />
            <Link
              to={`/moments/user/${me.username}`}
              className="absolute right-4 -bottom-7 flex items-end gap-3"
            >
              <span className="text-white font-medium drop-shadow mb-8">{me.displayName || me.firstName}</span>
              <img src={me.avatarUrl} alt="" className="w-16 h-16 rounded-lg border-2 border-white" />
            </Link>
          </div>
        )}
        {isLoading && <p className="p-4 text-sm text-wx-muted text-center">Loading…</p>}
        {isError && (
          <p className="p-4 text-sm text-red-500 text-center">
            Could not load Moments.{' '}
            <button type="button" className="text-wx-green" onClick={() => refetch()}>Retry</button>
          </p>
        )}
        {data && data.moments.length === 0 && (
          <p className="p-8 text-sm text-wx-muted text-center">No Moments yet. Tap the camera to share one.</p>
        )}
        {data?.moments.map((m) => <MomentCard key={m.id} moment={m} />)}
      </div>
    </div>
  )
}
