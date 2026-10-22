import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useCreateGroupChat } from '@/features/group-chats/api'
import { ContactPicker } from './ContactPicker'
import { displayName, useContacts } from './api'

/** "+" → New Chat: one contact starts a 1:1 chat, two or more create a group chat. */
export function NewChatPage() {
  const [params] = useSearchParams()
  const preUserId = params.get('userId')
  const token = useAuthStore((s) => s.accessToken)
  const navigate = useNavigate()
  const { data } = useContacts()
  const [selected, setSelected] = useState<string[]>(preUserId ? [preUserId] : [])
  const [content, setContent] = useState('Hello!')
  const [groupName, setGroupName] = useState('')
  const isGroup = selected.length >= 2

  const startDm = useMutation({
    mutationFn: () =>
      api<{ threadId: string }>('/messages/threads', {
        method: 'POST',
        headers: authHeaders(token!),
        body: JSON.stringify({ toUserId: selected[0], content: content.trim() }),
      }),
    onSuccess: (res) => navigate(`/chat/${res.threadId}`),
  })
  const createGroup = useCreateGroupChat()

  const defaultName = selected
    .map((id) => data?.contacts.find((c) => c.id === id))
    .filter((c) => !!c)
    .map((c) => displayName(c))
    .join(', ')
  const pending = startDm.isPending || createGroup.isPending
  const error = startDm.error ?? createGroup.error

  const submit = () => {
    if (isGroup) {
      createGroup.mutate(
        { name: groupName.trim() || undefined, memberIds: selected },
        { onSuccess: (res) => navigate(`/chat/${res.threadId}`) },
      )
    } else if (selected.length === 1 && content.trim()) {
      startDm.mutate()
    }
  }

  return (
    <div className="h-full flex flex-col bg-wx-bg">
      <header className="h-11 flex items-center justify-center bg-wx-header border-b border-wx-border shrink-0 relative">
        <Link to="/" className="absolute left-3 text-sm text-wx-text">Cancel</Link>
        <h1 className="font-medium">Select Contacts</h1>
        <button
          type="button"
          onClick={submit}
          disabled={selected.length === 0 || (!isGroup && !content.trim()) || pending}
          className="absolute right-3 bg-wx-green text-white text-sm px-3 py-1 rounded disabled:opacity-50"
        >
          {pending ? '…' : `Done${selected.length ? ` (${selected.length})` : ''}`}
        </button>
      </header>
      <div className="flex-1 overflow-y-auto">
        {error && <p className="px-4 pt-3 text-sm text-red-500">{error.message}</p>}
        {isGroup && (
          <>
            <p className="px-4 pt-3 pb-1 text-xs text-wx-muted">Group name (optional)</p>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              maxLength={30}
              placeholder={defaultName}
              className="w-full bg-wx-panel px-4 py-3 text-[15px] outline-none border-y border-wx-border"
            />
          </>
        )}
        {selected.length === 1 && (
          <>
            <p className="px-4 pt-3 pb-1 text-xs text-wx-muted">First message</p>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-20 bg-wx-panel px-4 py-3 text-[15px] outline-none border-y border-wx-border resize-none"
            />
          </>
        )}
        <p className="px-4 pt-3 pb-1 text-xs text-wx-muted">
          {selected.length === 0 ? 'Select one contact to chat, or several to start a group chat' : isGroup ? 'New group chat' : 'Select more contacts to create a group chat'}
        </p>
        <ContactPicker selected={selected} onChange={setSelected} />
      </div>
    </div>
  )
}
