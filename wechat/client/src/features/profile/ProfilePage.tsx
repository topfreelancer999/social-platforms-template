import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { rel } from '@/lib/format'
import { useAddContact, useUpdateContactMoments } from '@/features/contacts/api'
import { useUserMoments } from '@/features/moments/api'

type ProfileResponse = {
  user: { id: string; username: string; displayName?: string; firstName: string; lastName: string; about: string; phone: string; avatarUrl: string; bio: string; lastSeen: string }
  isSelf: boolean
  isFriend: boolean
  momentsPrivacy: { blockMyMoments: boolean; hideTheirMoments: boolean } | null
  tags: { id: string; name: string }[]
}

function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="flex items-center justify-between px-4 py-3 border-b border-wx-border text-sm">
      {label}
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 accent-wx-green"
      />
    </label>
  )
}

export function ProfilePage() {
  const { username } = useParams()
  const token = useAuthStore((s) => s.accessToken)
  const { data, isError } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => api<ProfileResponse>(`/users/${username}`, { headers: authHeaders(token!) }),
    enabled: !!username && !!token,
  })
  const canSeeMoments = !!data && (data.isSelf || data.isFriend)
  const { data: album } = useUserMoments(canSeeMoments ? username : undefined)
  const addContact = useAddContact()
  const updatePrivacy = useUpdateContactMoments()

  if (isError) return <p className="p-4 text-red-500">User not found.</p>
  if (!data) return <p className="p-4 text-wx-muted">Loading...</p>
  const { user, isSelf, isFriend, momentsPrivacy, tags } = data
  const thumbs = (album?.moments ?? []).filter((m) => m.imageUrl).slice(0, 4)

  return (
    <div className="h-full overflow-y-auto">
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

        {canSeeMoments && (
          <div className="bg-wx-panel rounded-lg mb-4 overflow-hidden border border-wx-border">
            {isFriend && (
              <Link to="/contacts/tags" className="flex items-center gap-3 px-4 py-3 border-b border-wx-border text-sm">
                <span className="w-16 shrink-0">Tags</span>
                <span className="flex-1 text-wx-muted truncate">{tags.map((t) => t.name).join(', ') || 'None'}</span>
                <span className="text-wx-muted">›</span>
              </Link>
            )}
            <Link to={`/moments/user/${user.username}`} className="flex items-center gap-3 px-4 py-3 text-sm">
              <span className="w-16 shrink-0">Moments</span>
              <span className="flex-1 flex gap-1 overflow-hidden">
                {thumbs.map((m) => (
                  <img key={m.id} src={m.imageUrl!} alt="" className="w-12 h-12 object-cover" />
                ))}
                {album && thumbs.length === 0 && <span className="text-wx-muted">No Moments</span>}
              </span>
              <span className="text-wx-muted">›</span>
            </Link>
          </div>
        )}

        {isFriend && momentsPrivacy && (
          <div className="bg-wx-panel rounded-lg mb-4 overflow-hidden border border-wx-border">
            <p className="px-4 pt-3 pb-1 text-xs text-wx-muted">Moments privacy</p>
            <Toggle
              label="Don't let them see my Moments"
              checked={momentsPrivacy.blockMyMoments}
              disabled={updatePrivacy.isPending}
              onChange={(v) => updatePrivacy.mutate({ userId: user.id, blockMyMoments: v })}
            />
            <Toggle
              label="Hide their Moments"
              checked={momentsPrivacy.hideTheirMoments}
              disabled={updatePrivacy.isPending}
              onChange={(v) => updatePrivacy.mutate({ userId: user.id, hideTheirMoments: v })}
            />
            {updatePrivacy.isError && <p className="px-4 py-2 text-xs text-red-500">{updatePrivacy.error.message}</p>}
          </div>
        )}

        <p className="text-xs text-wx-muted text-center mb-4">Last seen {rel(user.lastSeen)}</p>
        {isSelf ? (
          <Link to={`/profile/${username}/edit`} className="block text-center text-wx-green font-medium">
            Edit profile
          </Link>
        ) : (
          <div className="space-y-2">
            {!isFriend && (
              <button
                type="button"
                onClick={() => addContact.mutate(user.id)}
                disabled={addContact.isPending}
                className="block w-full text-center bg-wx-green text-white py-3 rounded-lg font-medium disabled:opacity-50"
              >
                Add to Contacts
              </button>
            )}
            <Link
              to={`/contacts/new?userId=${user.id}`}
              className={`block w-full text-center py-3 rounded-lg font-medium ${isFriend ? 'bg-wx-green text-white' : 'bg-wx-panel text-wx-green border border-wx-border'}`}
            >
              Message
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
