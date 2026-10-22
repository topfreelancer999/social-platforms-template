import { useParams } from 'react-router-dom'
import { Crown } from 'lucide-react'
import { PageHeader } from './PageHeader'
import { useGroupChat, useSetMemberRole, useTransferOwnership } from './api'

/** Owner-only: set or unset admins and transfer ownership. */
export function GroupManagePage() {
  const { threadId } = useParams()
  const { data, isLoading, isError, error } = useGroupChat(threadId)
  const setRole = useSetMemberRole(threadId)
  const transfer = useTransferOwnership(threadId)
  const busy = setRole.isPending || transfer.isPending
  const mutationError = setRole.error ?? transfer.error

  return (
    <div className="h-full flex flex-col bg-wx-bg">
      <PageHeader back={`/group-chat/${threadId}/info`} title="Manage Group" />
      <div className="flex-1 overflow-y-auto">
        {isLoading && <p className="p-4 text-sm text-wx-muted">Loading…</p>}
        {isError && <p className="p-4 text-sm text-red-500">{error.message}</p>}
        {data && data.me.role !== 'OWNER' && (
          <p className="p-4 text-sm text-wx-muted">Only the group owner can manage admins and ownership.</p>
        )}
        {data && data.me.role === 'OWNER' && (
          <>
            <p className="px-4 pt-3 pb-1 text-xs text-wx-muted">
              Admins can edit the Group Notice and @All. A group can have up to 3 admins.
            </p>
            {mutationError && <p className="px-4 py-2 text-sm text-red-500">{mutationError.message}</p>}
            <div className="bg-wx-panel divide-y divide-wx-border">
              {data.members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                  <img src={m.avatarUrl} alt="" className="w-10 h-10 rounded-md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{m.groupName}</p>
                    <p className="text-xs text-wx-muted flex items-center gap-1">
                      {m.role === 'OWNER' && <Crown size={12} className="text-[#fa9d3b]" />}
                      {m.role === 'OWNER' ? 'Owner' : m.role === 'ADMIN' ? 'Admin' : 'Member'}
                    </p>
                  </div>
                  {m.role !== 'OWNER' && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setRole.mutate({ userId: m.id, role: m.role === 'ADMIN' ? 'MEMBER' : 'ADMIN' })}
                        className="text-xs border border-wx-border rounded px-2 py-1 disabled:opacity-50"
                      >
                        {m.role === 'ADMIN' ? 'Remove Admin' : 'Make Admin'}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm(`Make ${m.groupName} the group owner? You will become a regular member.`)) {
                            transfer.mutate(m.id)
                          }
                        }}
                        className="text-xs border border-wx-border rounded px-2 py-1 disabled:opacity-50"
                      >
                        Transfer
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
