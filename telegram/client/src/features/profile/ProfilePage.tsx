import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'

export function ProfilePage() {
  const { username } = useParams()
  const token = useAuthStore((s) => s.accessToken)
  const { data } = useQuery({
    queryKey: ['profile', username],
    queryFn: () =>
      api<{
        user: { id: string; username: string; displayName?: string; bio: string; phone: string; avatarUrl: string; isOnline: boolean }
        isSelf: boolean
        isContact: boolean
      }>(`/users/${username}`, { headers: authHeaders(token!) }),
    enabled: !!username && !!token,
  })

  const addContact = useMutation({
    mutationFn: () =>
      api(`/contacts/${data!.user.id}`, { method: 'POST', headers: authHeaders(token), body: '{}' }),
  })

  const startChat = useMutation({
    mutationFn: async () => {
      const res = await api<{ threadId: string }>('/messages/threads', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ toUserId: data!.user.id, content: 'Hi!' }),
      })
      window.location.href = `/chat/${res.threadId}`
    },
  })

  if (!data) return <p className="p-6 text-[var(--tg-muted)]">Loading…</p>
  const { user, isSelf, isContact } = data

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white p-6">
      <img src={user.avatarUrl} alt="" className="mx-auto h-24 w-24 rounded-full" />
      <h1 className="mt-4 text-center text-xl font-bold">{user.displayName || user.username}</h1>
      <p className="text-center text-[var(--tg-muted)]">@{user.username}</p>
      {user.isOnline && <p className="text-center text-sm text-green-600">online</p>}
      {user.bio && <p className="mt-4 text-center text-sm">{user.bio}</p>}
      {user.phone && isSelf && <p className="mt-2 text-center text-sm text-[var(--tg-muted)]">{user.phone}</p>}

      <div className="mt-6 flex flex-col gap-2">
        {isSelf ? (
          <Link
            to={`/profile/${username}/edit`}
            className="rounded-lg bg-[var(--tg-sidebar)] py-2 text-center font-semibold"
          >
            Edit profile
          </Link>
        ) : (
          <>
            <Button
              className="rounded-lg bg-[var(--tg-blue)] text-white"
              onClick={() => startChat.mutate()}
            >
              Send message
            </Button>
            {!isContact && (
              <Button variant="secondary" onClick={() => addContact.mutate()}>
                Add to contacts
              </Button>
            )}
          </>
        )}
        <Link to="/settings" className="py-2 text-center text-sm text-[var(--tg-blue)]">
          Settings
        </Link>
      </div>
    </div>
  )
}
