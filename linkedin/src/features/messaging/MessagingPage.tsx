import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { authHeaders } from '@/hooks/useAuth'
import type { UserPublic } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { Spinner } from '@/components/ui/Spinner'
import { formatRelative } from '@/lib/format'

export function MessagingPage() {
  const { threadId } = useParams()
  const [message, setMessage] = useState('')
  const queryClient = useQueryClient()

  const { data: threads, isLoading } = useQuery({
    queryKey: ['threads'],
    queryFn: () =>
      api<
        {
          id: string
          participant: UserPublic
          lastMessage?: { content: string }
          unread: number
        }[]
      >('/messages/threads', { headers: authHeaders() }),
  })

  const { data: threadData } = useQuery({
    queryKey: ['thread', threadId],
    queryFn: () =>
      api<{
        participant: UserPublic
        messages: { id: string; content: string; senderId: string; createdAt: string; sender: UserPublic }[]
      }>(`/messages/threads/${threadId}`, { headers: authHeaders() }),
    enabled: !!threadId,
  })

  const send = useMutation({
    mutationFn: () =>
      api(`/messages/threads/${threadId}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ content: message }),
      }),
    onSuccess: () => {
      setMessage('')
      queryClient.invalidateQueries({ queryKey: ['thread', threadId] })
      queryClient.invalidateQueries({ queryKey: ['threads'] })
    },
  })

  return (
    <div className="flex h-[calc(100vh-120px)] max-w-[1000px] border rounded-lg overflow-hidden bg-white">
      <div className="w-full md:w-[320px] border-r overflow-y-auto">
        <div className="p-4 border-b font-semibold">Messaging</div>
        {isLoading && <Spinner className="m-4" />}
        {threads?.map((t) => (
          <Link
            key={t.id}
            to={`/messaging/${t.id}`}
            className={`flex gap-3 p-4 hover:bg-gray-50 border-b ${threadId === t.id ? 'bg-blue-50' : ''}`}
          >
            <Avatar
              src={t.participant.avatarUrl}
              name={`${t.participant.firstName} ${t.participant.lastName}`}
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">
                {t.participant.firstName} {t.participant.lastName}
              </p>
              <p className="text-xs text-linkedin-muted truncate">
                {t.lastMessage?.content}
              </p>
            </div>
            {t.unread > 0 && (
              <span className="bg-linkedin-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {t.unread}
              </span>
            )}
          </Link>
        ))}
      </div>
      <div className="hidden md:flex flex-1 flex-col">
        {threadId && threadData ? (
          <>
            <div className="p-4 border-b flex items-center gap-3">
              <Avatar
                src={threadData.participant.avatarUrl}
                name={`${threadData.participant.firstName} ${threadData.participant.lastName}`}
              />
              <p className="font-semibold">
                {threadData.participant.firstName} {threadData.participant.lastName}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {threadData.messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[70%] ${m.senderId === threadData.participant.id ? '' : 'ml-auto'}`}
                >
                  <div
                    className={`rounded-lg px-3 py-2 text-sm ${
                      m.senderId === threadData.participant.id
                        ? 'bg-linkedin-bg'
                        : 'bg-linkedin-primary text-white'
                    }`}
                  >
                    {m.content}
                  </div>
                  <p className="text-[10px] text-linkedin-muted mt-0.5">
                    {formatRelative(m.createdAt)}
                  </p>
                </div>
              ))}
            </div>
            <div className="p-4 border-t flex gap-2">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write a message..."
                className="flex-1 border rounded-full px-4 py-2 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && message.trim() && send.mutate()}
              />
              <button
                onClick={() => send.mutate()}
                disabled={!message.trim()}
                className="text-linkedin-primary font-semibold text-sm"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-linkedin-muted text-sm">
            Select a conversation
          </div>
        )}
      </div>
    </div>
  )
}
