import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { UnsavedChangesBar } from '@/components/discord/UnsavedChangesBar'
import type { Channel } from '@/features/server/types'

type Values = { name: string; topic: string }

/** Channel Settings → Overview: rename and set the topic (Manage Channels). */
export function ChannelOverviewSection({ channel, canEdit }: { channel: Channel; canEdit: boolean }) {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const [draft, setDraft] = useState<Values | null>(null)
  const saved: Values = { name: channel.name, topic: channel.topic ?? '' }
  const values = draft ?? saved
  const dirty = !!draft && (draft.name !== saved.name || draft.topic !== saved.topic)

  const save = useMutation({
    mutationFn: () =>
      api(`/channels/${channel.id}`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(values) }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['server'] }),
        qc.invalidateQueries({ queryKey: ['channel', channel.id] }),
      ])
      setDraft(null)
    },
  })

  return (
    <div>
      <h1 className="text-xl font-semibold mb-5">Overview</h1>
      {!canEdit && <p className="text-sm text-dc-muted mb-4">You need the Manage Channels permission to edit this channel.</p>}
      <label className="block mb-5">
        <span className="text-xs font-bold uppercase text-dc-muted">Channel name</span>
        <input
          value={values.name}
          disabled={!canEdit}
          maxLength={100}
          onChange={(e) => setDraft({ ...values, name: e.target.value })}
          className="mt-2 w-full rounded bg-dc-rail px-3 py-2.5 outline-none focus:ring-2 focus:ring-dc-blurple disabled:opacity-50"
        />
      </label>
      <label className="block">
        <span className="text-xs font-bold uppercase text-dc-muted">Channel topic</span>
        <textarea
          value={values.topic}
          disabled={!canEdit}
          maxLength={1024}
          rows={3}
          placeholder="Let everyone know how to use this channel!"
          onChange={(e) => setDraft({ ...values, topic: e.target.value })}
          className="mt-2 w-full rounded bg-dc-rail px-3 py-2.5 outline-none focus:ring-2 focus:ring-dc-blurple disabled:opacity-50 resize-y"
        />
      </label>
      {dirty && (
        <UnsavedChangesBar
          onReset={() => {
            setDraft(null)
            save.reset()
          }}
          onSave={() => {
            if (values.name.trim()) save.mutate()
          }}
          saving={save.isPending}
          error={!values.name.trim() ? 'Channel name is required.' : save.error?.message}
        />
      )}
    </div>
  )
}
