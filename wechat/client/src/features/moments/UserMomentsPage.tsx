import { Link, useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { Camera } from 'lucide-react'
import { displayName } from '@/features/contacts/api'
import { VisibilityBadge } from './MomentCard'
import { RANGE_LABELS, useUserMoments } from './api'

/** A user's Moments album (filtered server-side for the viewer). */
export function UserMomentsPage() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useUserMoments(username)

  return (
    <div className="h-full flex flex-col bg-wx-panel">
      <header className="h-11 flex items-center justify-center bg-wx-panel border-b border-wx-border shrink-0 relative">
        <button type="button" onClick={() => navigate(-1)} className="absolute left-3 text-sm">←</button>
        <h1 className="font-medium">{data ? displayName(data.user) : 'Moments'}</h1>
        {data?.isSelf && (
          <Link to="/moments/post" className="absolute right-3" aria-label="Post a Moment">
            <Camera size={22} />
          </Link>
        )}
      </header>
      <div className="flex-1 overflow-y-auto">
        {isLoading && <p className="p-4 text-sm text-wx-muted text-center">Loading…</p>}
        {isError && <p className="p-4 text-sm text-red-500 text-center">Could not load Moments.</p>}
        {data && (
          <>
            <div className="relative mb-10">
              <img src={data.user.coverUrl} alt="" className="w-full h-40 object-cover" />
              <Link to={`/profile/${data.user.username}`} className="absolute right-4 -bottom-7 flex items-end gap-3">
                <span className="text-white font-medium drop-shadow mb-8">{displayName(data.user)}</span>
                <img src={data.user.avatarUrl} alt="" className="w-16 h-16 rounded-lg border-2 border-white" />
              </Link>
            </div>
            {!data.isSelf && !data.isFriend && (
              <p className="px-4 py-8 text-sm text-wx-muted text-center">
                Add {displayName(data.user)} as a contact to see their Moments.
              </p>
            )}
            {(data.isSelf || data.isFriend) && data.moments.length === 0 && (
              <p className="px-4 py-8 text-sm text-wx-muted text-center">No Moments to show.</p>
            )}
            <ul>
              {data.moments.map((m) => {
                const d = new Date(m.createdAt)
                return (
                  <li key={m.id}>
                    <Link to={`/moments/${m.id}`} className="flex gap-3 px-4 py-3 hover:bg-wx-bg">
                      <div className="w-14 shrink-0">
                        <span className="text-2xl font-semibold">{format(d, 'dd')}</span>
                        <span className="text-xs ml-0.5">{format(d, 'MMM')}</span>
                      </div>
                      {m.imageUrl && <img src={m.imageUrl} alt="" className="w-20 h-20 object-cover shrink-0" />}
                      <div className={`flex-1 min-w-0 ${m.imageUrl ? '' : 'bg-wx-bg p-2'}`}>
                        <p className="text-sm line-clamp-3 break-words">{m.content}</p>
                        <p className="text-xs text-wx-muted mt-1 flex items-center gap-1">
                          {m.location}
                          {m.isAuthor && <VisibilityBadge moment={m} />}
                        </p>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
            {data.range && data.range !== 'ALL' && (
              <p className="px-4 py-6 text-xs text-wx-muted text-center">
                {data.isSelf
                  ? `Friends can only see your Moments from: ${RANGE_LABELS[data.range]}.`
                  : `Only showing Moments from: ${RANGE_LABELS[data.range]}.`}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
