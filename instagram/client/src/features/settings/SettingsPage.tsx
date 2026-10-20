import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AtSign, Image, Lock, UserCheck } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { cn } from '@/lib/cn'
import { useAuthStore, type User } from '@/stores/authStore'
import { ConfirmSheet } from '@/components/ui/Sheet'
import { activityQueryKey, followRequestsQueryKey } from '@/features/notifications/activity'

const sections = [
  { id: 'account', label: 'Account' },
  { id: 'privacy', label: 'Account privacy' },
  { id: 'notifications', label: 'Notifications' },
]

type SettingsData = { settings: Record<string, unknown>; email: string; isPrivate: boolean; pendingRequests: number }

function Bullet({ icon: Icon, children }: { icon: typeof Lock; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 items-start text-left">
      <Icon size={22} className="shrink-0 text-ig-text mt-0.5" />
      <span>{children}</span>
    </li>
  )
}

function AccountPrivacy({ data }: { data: SettingsData }) {
  const { accessToken, setAuth } = useAuthStore()
  const qc = useQueryClient()
  // The value the user is about to switch to; non-null while the confirmation sheet is open.
  const [target, setTarget] = useState<boolean | null>(null)
  const change = useMutation({
    mutationFn: (isPrivate: boolean) =>
      api<{ user: User; isPrivate: boolean; autoAccepted: number }>('/settings/privacy', {
        method: 'PATCH',
        headers: authHeaders(accessToken),
        body: JSON.stringify({ isPrivate }),
      }),
    onSuccess: (res) => {
      setTarget(null)
      setAuth(res.user, accessToken!)
      qc.invalidateQueries({ queryKey: ['settings'] })
      qc.invalidateQueries({ queryKey: ['profile', res.user.username] })
      qc.invalidateQueries({ queryKey: activityQueryKey })
      qc.invalidateQueries({ queryKey: followRequestsQueryKey })
    },
  })
  const result = change.data

  return (
    <>
      <h1 className="text-xl font-bold mb-6">Account privacy</h1>
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-ig-border p-4">
        <span id="private-account-label" className="font-medium">Private account</span>
        <button
          type="button"
          role="switch"
          aria-checked={data.isPrivate}
          aria-labelledby="private-account-label"
          onClick={() => {
            change.reset()
            setTarget(!data.isPrivate)
          }}
          className={cn(
            'relative w-11 h-6 rounded-full transition-colors shrink-0',
            data.isPrivate ? 'bg-ig-blue' : 'bg-ig-button',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform',
              data.isPrivate && 'translate-x-5',
            )}
          />
        </button>
      </div>
      <p className="text-xs text-ig-muted mt-4 leading-relaxed">
        When your account is public, your profile and posts can be seen by anyone, on or off Instagram, even if they
        don't have an Instagram account.
      </p>
      <p className="text-xs text-ig-muted mt-3 leading-relaxed">
        When your account is private, only the followers you approve can see what you share, including your photos or
        videos on hashtag and location pages, and your followers and following lists. Certain info on your profile, like
        your profile picture and username, is visible to everyone on and off Instagram.
      </p>
      {data.isPrivate && data.pendingRequests > 0 && (
        <Link to="/notifications/requests" className="inline-block mt-4 text-sm font-semibold text-ig-blue">
          Review {data.pendingRequests} pending follow {data.pendingRequests === 1 ? 'request' : 'requests'}
        </Link>
      )}
      {result && (
        <p role="status" className="text-sm text-green-500 mt-4">
          Your account is now {result.isPrivate ? 'private' : 'public'}.
          {result.autoAccepted > 0 &&
            ` ${result.autoAccepted} pending follow ${result.autoAccepted === 1 ? 'request was' : 'requests were'} approved.`}
        </p>
      )}

      {target !== null && (
        <ConfirmSheet
          title={target ? 'Switch to private account?' : 'Switch to public account?'}
          confirmLabel={target ? 'Switch to private' : 'Switch to public'}
          pending={change.isPending}
          error={change.error?.message}
          onConfirm={() => change.mutate(target)}
          onCancel={() => setTarget(null)}
        >
          <ul className="space-y-4 mt-4 text-ig-text">
            {target ? (
              <Bullet icon={Image}>Only your followers will be able to see your photos and videos.</Bullet>
            ) : (
              <Bullet icon={Image}>Anyone can see your posts, reels and stories and can use your original audio.</Bullet>
            )}
            <Bullet icon={AtSign}>This won't change who can message, tag or @mention you.</Bullet>
            {!target && data.pendingRequests > 0 && (
              <Bullet icon={UserCheck}>
                Your {data.pendingRequests} pending follow {data.pendingRequests === 1 ? 'request' : 'requests'} will be
                approved.
              </Bullet>
            )}
          </ul>
        </ConfirmSheet>
      )}
    </>
  )
}

export function SettingsPage() {
  const { section = 'account' } = useParams()
  const { accessToken, logout } = useAuthStore()
  const qc = useQueryClient()
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api<SettingsData>('/settings', { headers: authHeaders(accessToken) }),
  })
  const save = useMutation({
    mutationFn: (body: object) => api('/settings', { method: 'PATCH', headers: authHeaders(accessToken), body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  })
  const s = data?.settings ?? {}
  return (
    <div className="flex flex-col md:flex-row gap-4 max-w-3xl mx-auto p-4">
      <nav className="flex flex-wrap md:flex-nowrap md:flex-col gap-1 md:w-52 shrink-0 h-fit md:border md:border-ig-border md:rounded-xl md:p-2">
        {sections.map((sec) => (
          <Link
            key={sec.id}
            to={`/settings/${sec.id}`}
            className={cn(
              'block px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap',
              section === sec.id ? 'bg-ig-elevated' : 'hover:bg-ig-hover',
            )}
          >
            {sec.label}
          </Link>
        ))}
        <button onClick={() => { logout(); api('/auth/logout', { method: 'POST', credentials: 'include' }) }} className="text-left px-3 py-2 text-ig-danger text-sm md:mt-4 whitespace-nowrap">Log out</button>
      </nav>
      <section className="flex-1 min-w-0 md:border md:border-ig-border md:rounded-xl p-2 md:p-6">
        {isLoading && <p className="text-ig-muted text-sm">Loading...</p>}
        {isError && (
          <p className="text-sm text-ig-muted">
            {error.message}{' '}
            <button type="button" onClick={() => refetch()} className="font-semibold text-ig-blue">Try again</button>
          </p>
        )}
        {data && section === 'account' && (
          <>
            <h1 className="text-xl font-bold mb-4">Account</h1>
            <p className="text-sm mb-4">Email: {data.email}</p>
            <input type="password" placeholder="New password" className="bg-transparent border border-ig-border rounded-lg px-3 py-2 w-full text-sm" onBlur={(e) => e.target.value && save.mutate({ password: e.target.value })} />
          </>
        )}
        {data && section === 'privacy' && <AccountPrivacy data={data} />}
        {data && section === 'notifications' && (
          <>
            <h1 className="text-xl font-bold mb-4">Notifications</h1>
            {['emailNotifications', 'pushNotifications'].map((key) => (
              <label key={key} className="flex justify-between py-2 text-sm capitalize">
                {key.replace(/([A-Z])/g, ' $1')}
                <input type="checkbox" defaultChecked={!!s[key]} onChange={(e) => save.mutate({ [key]: e.target.checked })} />
              </label>
            ))}
          </>
        )}
        {save.isSuccess && <p className="text-green-500 text-sm mt-2">Saved.</p>}
      </section>
    </div>
  )
}
