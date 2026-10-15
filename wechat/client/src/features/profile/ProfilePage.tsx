import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { rel } from '@/lib/format'

export function ProfilePage() {
  const { username } = useParams()
  const token = useAuthStore((s) => s.accessToken)
  const { data } = useQuery({
    queryKey: ['profile', username],
    queryFn: () =>
      api<{
        user: { id: string; username: string; displayName?: string; firstName: string; lastName: string; about: string; phone: string; avatarUrl: string; bio: string; lastSeen: string }
        isSelf: boolean
      }>(`/users/${username}`, { headers: authHeaders(token!) }),
    enabled: !!username && !!token,
  })

  if (!data) return <p className="p-4 text-wx-muted">Loading...</p>
  const { user, isSelf } = data

  return (
    <div className="max-w-lg mx-auto p-6">
      <div className="text-center mb-6">
        <img src={user.avatarUrl} alt="" className="w-32 h-32 rounded-full mx-auto mb-4 object-cover" />
        <h1 className="text-2xl font-light">{user.displayName || `${user.firstName} ${user.lastName}`}</h1>
        <p className="text-wx-muted">{user.phone || `@${user.username}`}</p>
      </div>
      <div className="bg-wx-incoming rounded-lg p-4 mb-4">
        <p className="text-xs text-wx-green uppercase mb-1">About</p>
        <p className="text-sm">{user.about || user.bio}</p>
      </div>
      <p className="text-xs text-wx-muted text-center mb-4">Last seen {rel(user.lastSeen)}</p>
      {isSelf ? (
        <Link to={`/profile/${username}/edit`} className="block text-center text-wx-green font-medium">
          Edit profile
        </Link>
      ) : (
        <Link
          to={`/contacts/new?userId=${user.id}`}
          className="block w-full text-center bg-wx-green text-white py-3 rounded-lg font-medium"
        >
          Message
        </Link>
      )}
    </div>
  )
}
