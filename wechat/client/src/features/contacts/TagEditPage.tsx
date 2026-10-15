import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ContactPicker } from './ContactPicker'
import { type ContactTag, useDeleteTag, useSaveTag, useTag } from './api'

/** Create (/contacts/tags/new) or edit (/contacts/tags/:id) a contact tag. */
export function TagEditPage() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const { data, isLoading, isError } = useTag(isNew ? undefined : id)

  if (!isNew && isLoading) return <p className="p-4 text-sm text-wx-muted">Loading…</p>
  if (!isNew && (isError || !data)) {
    return (
      <div className="p-4 text-sm">
        <p className="text-red-500">Tag not found.</p>
        <Link to="/contacts/tags" className="text-wx-green">Back to tags</Link>
      </div>
    )
  }
  return <TagForm key={data?.id ?? 'new'} tag={isNew ? undefined : data} />
}

function TagForm({ tag }: { tag?: ContactTag }) {
  const navigate = useNavigate()
  const [name, setName] = useState(tag?.name ?? '')
  const [memberIds, setMemberIds] = useState<string[]>(tag?.members.map((m) => m.id) ?? [])
  const save = useSaveTag()
  const remove = useDeleteTag()

  const submit = () =>
    save.mutate(
      { id: tag?.id, name: name.trim(), memberIds },
      { onSuccess: () => navigate('/contacts/tags') },
    )

  return (
    <div className="h-full flex flex-col bg-wx-bg">
      <header className="h-11 flex items-center justify-center bg-wx-panel border-b border-wx-border shrink-0 relative">
        <Link to="/contacts/tags" className="absolute left-3 text-wx-text text-sm">Cancel</Link>
        <h1 className="font-medium">{tag ? 'Edit Tag' : 'New Tag'}</h1>
        <button
          type="button"
          onClick={submit}
          disabled={!name.trim() || save.isPending}
          className="absolute right-3 bg-wx-green text-white text-sm px-3 py-1 rounded disabled:opacity-50"
        >
          {save.isPending ? 'Saving…' : 'Done'}
        </button>
      </header>
      <div className="flex-1 overflow-y-auto">
        <p className="px-4 pt-3 pb-1 text-xs text-wx-muted">Tag name</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          placeholder="e.g. Family, Colleagues"
          className="w-full bg-wx-panel px-4 py-3 text-[15px] outline-none border-y border-wx-border"
        />
        {save.isError && <p className="px-4 pt-2 text-sm text-red-500">{save.error.message}</p>}
        <p className="px-4 pt-4 pb-1 text-xs text-wx-muted">Members ({memberIds.length})</p>
        <ContactPicker selected={memberIds} onChange={setMemberIds} />
        {tag && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Delete tag “${tag.name}”?`)) {
                remove.mutate(tag.id, { onSuccess: () => navigate('/contacts/tags') })
              }
            }}
            className="w-full bg-wx-panel text-red-500 py-3 mt-4 mb-6 border-y border-wx-border"
          >
            Delete Tag
          </button>
        )}
      </div>
    </div>
  )
}
