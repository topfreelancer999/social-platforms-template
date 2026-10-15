import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Card } from '@/components/ui/Card'

const sections = [
  { id: 'account', label: 'Account' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'notifications', label: 'Notifications' },
]

export function SettingsPage() {
  const { section = 'account' } = useParams()
  const { accessToken, logout } = useAuthStore()
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api<{ settings: Record<string, unknown>; email: string }>('/settings', { headers: authHeaders(accessToken) }),
  })
  const save = useMutation({
    mutationFn: (body: object) => api('/settings', { method: 'PATCH', headers: authHeaders(accessToken), body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  })
  const s = data?.settings ?? {}
  return (
    <div className="flex gap-4 max-w-3xl">
      <Card className="p-2 w-48 shrink-0 h-fit">
        {sections.map((sec) => (
          <Link key={sec.id} to={`/settings/${sec.id}`} className={`block px-3 py-2 rounded-lg text-sm font-medium ${section === sec.id ? 'bg-[#e7f3ff] text-fb-primary' : 'hover:bg-[#f0f2f5]'}`}>{sec.label}</Link>
        ))}
        <button onClick={() => { logout(); api('/auth/logout', { method: 'POST', credentials: 'include' }) }} className="w-full text-left px-3 py-2 text-red-600 text-sm mt-4">Log out</button>
      </Card>
      <Card className="p-6 flex-1">
        {section === 'account' && (
          <>
            <h1 className="text-xl font-bold mb-4">Account</h1>
            <p className="text-sm mb-4">Email: {data?.email}</p>
            <input type="password" placeholder="New password" className="border rounded-lg px-3 py-2 w-full text-sm" onBlur={(e) => e.target.value && save.mutate({ password: e.target.value })} />
          </>
        )}
        {section === 'privacy' && (
          <>
            <h1 className="text-xl font-bold mb-4">Privacy</h1>
            <label className="flex justify-between py-2 text-sm">
              Profile visibility
              <select defaultValue={String(s.profileVisibility)} onChange={(e) => save.mutate({ profileVisibility: e.target.value })} className="border rounded px-2">
                <option value="public">Everyone</option>
                <option value="friends">Friends only</option>
              </select>
            </label>
            <label className="flex justify-between py-2 text-sm">
              Last seen
              <select defaultValue={String(s.lastSeenPrivacy ?? 'everyone')} onChange={(e) => save.mutate({ lastSeenPrivacy: e.target.value })} className="border rounded px-2">
                <option value="everyone">Everybody</option>
                <option value="contacts">My contacts</option>
                <option value="nobody">Nobody</option>
              </select>
            </label>
            <label className="flex justify-between py-2 text-sm">
              Phone number
              <select defaultValue={String(s.phoneVisibility ?? 'contacts')} onChange={(e) => save.mutate({ phoneVisibility: e.target.value })} className="border rounded px-2">
                <option value="everyone">Everybody</option>
                <option value="contacts">My contacts</option>
                <option value="nobody">Nobody</option>
              </select>
            </label>
          </>
        )}
        {section === 'notifications' && (
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
        {save.isSuccess && <p className="text-green-600 text-sm mt-2">Saved.</p>}
      </Card>
    </div>
  )
}
