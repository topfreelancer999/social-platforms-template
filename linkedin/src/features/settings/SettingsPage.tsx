import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { authHeaders } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'
import type { Settings } from '@/types'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/cn'

const sections = [
  { id: 'account', label: 'Account' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'communications', label: 'Communications' },
  { id: 'general', label: 'General' },
]

export function SettingsPage() {
  const { section = 'account' } = useParams()
  const logout = useAuthStore((s) => s.logout)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () =>
      api<{ settings: Settings; email: string }>('/settings', {
        headers: authHeaders(),
      }),
  })

  const update = useMutation({
    mutationFn: (patch: Partial<Settings>) =>
      api('/settings', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(patch),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  })

  if (isLoading) return <Spinner className="mx-auto mt-12" />
  const settings = data?.settings

  return (
    <div className="max-w-[900px] flex gap-4">
      <Card className="w-56 shrink-0 p-2 h-fit">
        <h2 className="font-semibold px-3 py-2 text-sm">Settings</h2>
        {sections.map((s) => (
          <Link
            key={s.id}
            to={`/settings/${s.id}`}
            className={cn(
              'block px-3 py-2 text-sm rounded hover:bg-gray-100',
              section === s.id && 'bg-blue-50 text-linkedin-primary font-semibold',
            )}
          >
            {s.label}
          </Link>
        ))}
        <button
          onClick={logout}
          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100 rounded mt-4"
        >
          Sign out
        </button>
      </Card>
      <Card className="flex-1">
        {section === 'account' && (
          <>
            <h1 className="text-xl font-semibold mb-4">Account</h1>
            <p className="text-sm mb-4">
              <span className="text-linkedin-muted">Email: </span>
              {data?.email}
            </p>
            <p className="text-sm text-linkedin-muted">
              Password change is simulated in this demo.
            </p>
          </>
        )}
        {section === 'privacy' && settings && (
          <>
            <h1 className="text-xl font-semibold mb-4">Privacy</h1>
            <label className="flex items-center justify-between py-3 border-b">
              <span className="text-sm">Profile visibility</span>
              <select
                value={settings.profileVisibility}
                onChange={(e) =>
                  update.mutate({
                    profileVisibility: e.target.value as Settings['profileVisibility'],
                  })
                }
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="public">Public</option>
                <option value="connections">Connections</option>
                <option value="private">Private</option>
              </select>
            </label>
            <label className="flex items-center justify-between py-3">
              <span className="text-sm">Show activity status</span>
              <input
                type="checkbox"
                checked={settings.activityVisibility}
                onChange={(e) => update.mutate({ activityVisibility: e.target.checked })}
              />
            </label>
          </>
        )}
        {section === 'notifications' && settings && (
          <>
            <h1 className="text-xl font-semibold mb-4">Notifications</h1>
            {[
              { key: 'emailNotifications' as const, label: 'Email notifications' },
              { key: 'pushNotifications' as const, label: 'Push notifications' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between py-3 border-b">
                <span className="text-sm">{label}</span>
                <input
                  type="checkbox"
                  checked={settings[key]}
                  onChange={(e) => update.mutate({ [key]: e.target.checked })}
                />
              </label>
            ))}
          </>
        )}
        {section === 'communications' && settings && (
          <>
            <h1 className="text-xl font-semibold mb-4">Communications</h1>
            <label className="flex items-center justify-between py-3">
              <span className="text-sm">Who can message you</span>
              <select
                value={settings.messagingFrom}
                onChange={(e) =>
                  update.mutate({
                    messagingFrom: e.target.value as Settings['messagingFrom'],
                  })
                }
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="connections">Connections only</option>
                <option value="everyone">Everyone</option>
              </select>
            </label>
          </>
        )}
        {section === 'general' && settings && (
          <>
            <h1 className="text-xl font-semibold mb-4">General</h1>
            <label className="flex items-center justify-between py-3 border-b">
              <span className="text-sm">Language</span>
              <select
                value={settings.language}
                onChange={(e) => update.mutate({ language: e.target.value })}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </label>
            <label className="flex items-center justify-between py-3">
              <span className="text-sm">Theme</span>
              <select
                value={settings.theme}
                onChange={(e) =>
                  update.mutate({ theme: e.target.value as 'light' | 'dark' })
                }
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
          </>
        )}
        {update.isSuccess && (
          <p className="text-sm text-green-600 mt-4">Settings saved.</p>
        )}
      </Card>
    </div>
  )
}
