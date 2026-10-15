import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'

export function NewChatPage() {
  const [params] = useSearchParams()
  const preUserId = params.get('userId')
  const token = useAuthStore((s) => s.accessToken)
  const navigate = useNavigate()
  const [toUserId, setToUserId] = useState(preUserId ?? '')
  const [content, setContent] = useState('Hello!')
  const [groupName, setGroupName] = useState('')
  const [mode, setMode] = useState<'dm' | 'group'>('dm')

  const { data: contacts } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => api<{ contacts: { id: string; displayName?: string; firstName: string; username: string }[] }>('/contacts', {
      headers: authHeaders(token!),
    }),
    enabled: !!token,
  })

  const startDm = useMutation({
    mutationFn: () =>
      api<{ threadId: string }>('/messages/threads', {
        method: 'POST',
        headers: authHeaders(token!),
        body: JSON.stringify({ toUserId, content }),
      }),
    onSuccess: (res) => navigate(`/chat/${res.threadId}`),
  })

  const startGroup = useMutation({
    mutationFn: () =>
      api<{ threadId: string }>('/messages/groups', {
        method: 'POST',
        headers: authHeaders(token!),
        body: JSON.stringify({ name: groupName, memberIds: [toUserId].filter(Boolean), content }),
      }),
    onSuccess: (res) => navigate(`/chat/${res.threadId}`),
  })

  return (
    <div className="h-full flex flex-col bg-wx-header p-4">
      <Link to="/contacts" className="text-sm text-wx-green mb-4">← Back</Link>
      <h1 className="text-xl font-medium mb-4">New chat</h1>
      <div className="flex gap-2 mb-4">
        <button type="button" onClick={() => setMode('dm')} className={`px-3 py-1 rounded ${mode === 'dm' ? 'bg-wx-green text-white' : 'bg-wx-panel'}`}>Message</button>
        <button type="button" onClick={() => setMode('group')} className={`px-3 py-1 rounded ${mode === 'group' ? 'bg-wx-green text-white' : 'bg-wx-panel'}`}>Group</button>
      </div>
      {mode === 'group' && (
        <input
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Group name"
          className="w-full mb-3 bg-wx-panel rounded-lg px-3 py-2 text-sm border border-wx-border"
        />
      )}
      <select
        value={toUserId}
        onChange={(e) => setToUserId(e.target.value)}
        className="w-full mb-3 bg-wx-panel rounded-lg px-3 py-2 text-sm border border-wx-border"
      >
        <option value="">Select contact</option>
        {contacts?.contacts.map((c) => (
          <option key={c.id} value={c.id}>{c.displayName || c.firstName} (@{c.username})</option>
        ))}
      </select>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full h-24 bg-wx-panel rounded-lg px-3 py-2 text-sm border border-wx-border mb-4"
        placeholder="First message"
      />
      <Button
        onClick={() => (mode === 'dm' ? startDm : startGroup).mutate()}
        disabled={!toUserId || (mode === 'group' && !groupName.trim())}
        className="w-full bg-wx-green"
      >
        Start chat
      </Button>
    </div>
  )
}
