import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ContactPicker } from '@/features/contacts/ContactPicker'
import { PageHeader } from './PageHeader'
import { useAddMembers, useGroupChat } from './api'

/** "+" in Chat Info: pick contacts to add to the group. */
export function GroupAddMembersPage() {
  const { threadId } = useParams()
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useGroupChat(threadId)
  const add = useAddMembers(threadId)
  const [selected, setSelected] = useState<string[]>([])

  return (
    <div className="h-full flex flex-col bg-wx-bg">
      <PageHeader
        back={`/group-chat/${threadId}/info`}
        title="Add Members"
        right={
          <button
            type="button"
            disabled={selected.length === 0 || add.isPending}
            onClick={() => add.mutate(selected, { onSuccess: () => navigate(`/group-chat/${threadId}/info`) })}
            className="text-sm bg-wx-green text-white rounded px-3 py-1 disabled:opacity-50"
          >
            {add.isPending ? 'Adding…' : `Done${selected.length ? ` (${selected.length})` : ''}`}
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto">
        {isLoading && <p className="p-4 text-sm text-wx-muted">Loading…</p>}
        {isError && <p className="p-4 text-sm text-red-500">{error.message}</p>}
        {add.isError && <p className="px-4 py-2 text-sm text-red-500">{add.error.message}</p>}
        {data && (
          <ContactPicker selected={selected} onChange={setSelected} disabledIds={data.members.map((m) => m.id)} />
        )}
      </div>
    </div>
  )
}
