import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Modal } from '@/components/ui/Modal'
import { canDeleteForEveryone, type Msg, type ThreadInfo } from './types'

export function DeleteDialog({
  messages,
  thread,
  onClose,
  onDeleted,
}: {
  messages: Msg[]
  thread: ThreadInfo
  onClose: () => void
  onDeleted: () => void
}) {
  const { accessToken, user } = useAuthStore()
  const qc = useQueryClient()
  const [forEveryone, setForEveryone] = useState(false)
  const everyoneAllowed = messages.length > 0 && messages.every((m) => canDeleteForEveryone(m, user?.id, thread))
  const many = messages.length > 1

  const remove = useMutation({
    mutationFn: () =>
      api('/messages/delete', {
        method: 'POST',
        headers: authHeaders(accessToken),
        body: JSON.stringify({ messageIds: messages.map((m) => m.id), forEveryone: everyoneAllowed && forEveryone }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['thread', thread.id] })
      qc.invalidateQueries({ queryKey: ['threads'] })
      onDeleted()
    },
  })

  return (
    <Modal labelledBy="delete-title" onClose={onClose}>
      <div className="p-5">
        <h2 id="delete-title" className="text-lg font-semibold">
          {many ? `Delete ${messages.length} messages` : 'Delete message'}
        </h2>
        <p className="mt-2 text-sm text-[var(--tg-muted)]">
          Are you sure you want to delete {many ? 'these messages' : 'this message'}?
        </p>
        {everyoneAllowed && (
          <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={forEveryone}
              onChange={(e) => setForEveryone(e.target.checked)}
              className="h-4 w-4 accent-[var(--tg-blue)]"
            />
            {thread.isGroup ? 'Delete for everyone' : `Also delete for ${thread.title}`}
          </label>
        )}
        {remove.isError && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {remove.error.message}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-[var(--tg-blue)] hover:bg-[var(--tg-blue)]/10"
          >
            Cancel
          </button>
          <button
            type="button"
            autoFocus
            disabled={remove.isPending}
            onClick={() => remove.mutate()}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {remove.isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
