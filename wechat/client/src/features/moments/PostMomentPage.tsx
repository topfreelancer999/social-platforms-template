import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, ImagePlus, Lock, MapPin, Users, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { SAMPLE_MOMENT_IMAGE } from '@/lib/constants'
import { ContactPicker } from '@/features/contacts/ContactPicker'
import { displayName, useContacts, useTags } from '@/features/contacts/api'
import { type MomentVisibility, useCreateMoment } from './api'

const OPTIONS: { value: MomentVisibility; label: string; hint: string }[] = [
  { value: 'PUBLIC', label: 'Public', hint: 'All friends' },
  { value: 'PRIVATE', label: 'Private', hint: 'Only me' },
  { value: 'INCLUDE', label: 'Visible to', hint: 'Selected friends' },
  { value: 'EXCLUDE', label: "Don't share with", hint: 'Exclude selected friends' },
]

export function PostMomentPage() {
  const navigate = useNavigate()
  const create = useCreateMoment()
  const { data: contactsData } = useContacts()
  const [step, setStep] = useState<'compose' | 'audience'>('compose')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [location, setLocation] = useState('')
  const [visibility, setVisibility] = useState<MomentVisibility>('PUBLIC')
  const [tagIds, setTagIds] = useState<string[]>([])
  const [userIds, setUserIds] = useState<string[]>([])

  const restricted = visibility === 'INCLUDE' || visibility === 'EXCLUDE'
  const needsAudience = restricted && tagIds.length + userIds.length === 0
  const canPost = (content.trim().length > 0 || !!imageUrl) && !needsAudience && !create.isPending

  const { data: tagsData } = useTags()
  const selectedNames = [
    ...(tagsData?.tags.filter((t) => tagIds.includes(t.id)).map((t) => t.name) ?? []),
    ...(contactsData?.contacts.filter((c) => userIds.includes(c.id)).map(displayName) ?? []),
  ]
  const option = OPTIONS.find((o) => o.value === visibility)!
  const summary = restricted ? selectedNames.join(', ') || 'None selected' : option.hint

  const submit = () =>
    create.mutate(
      { content: content.trim(), imageUrl, location: location.trim(), visibility, tagIds, userIds },
      { onSuccess: () => navigate('/moments') },
    )

  if (step === 'audience') {
    return (
      <AudiencePicker
        visibility={visibility}
        tagIds={tagIds}
        userIds={userIds}
        onChange={(v, t, u) => {
          setVisibility(v)
          setTagIds(t)
          setUserIds(u)
        }}
        onDone={() => setStep('compose')}
      />
    )
  }

  return (
    <div className="h-full flex flex-col bg-wx-bg">
      <header className="h-11 flex items-center justify-center bg-wx-panel border-b border-wx-border shrink-0 relative">
        <Link to="/moments" className="absolute left-3 text-sm">Cancel</Link>
        <h1 className="font-medium">New Moment</h1>
        <button
          type="button"
          onClick={submit}
          disabled={!canPost}
          className="absolute right-3 bg-wx-green text-white text-sm px-3 py-1 rounded disabled:opacity-50"
        >
          {create.isPending ? 'Posting…' : 'Post'}
        </button>
      </header>
      <div className="flex-1 overflow-y-auto">
        <div className="bg-wx-panel p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={2000}
            placeholder="Say something…"
            className="w-full h-28 resize-none outline-none text-[15px]"
          />
          {imageUrl ? (
            <div className="relative w-24 h-24">
              <img src={imageUrl} alt="" className="w-24 h-24 object-cover rounded" />
              <button
                type="button"
                onClick={() => setImageUrl(null)}
                className="absolute -top-2 -right-2 bg-black/60 text-white rounded-full p-0.5"
                aria-label="Remove photo"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setImageUrl(`${SAMPLE_MOMENT_IMAGE.replace('wx-upload', `wx-upload-${Date.now()}`)}`)}
              className="w-24 h-24 bg-wx-bg rounded flex items-center justify-center text-wx-muted"
              aria-label="Add photo"
            >
              <ImagePlus size={28} />
            </button>
          )}
        </div>
        <div className="bg-wx-panel mt-2">
          <label className="flex items-center gap-3 px-4 py-3 border-b border-wx-border">
            <MapPin size={18} className="text-wx-muted" />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={100}
              placeholder="Location"
              className="flex-1 outline-none text-[15px]"
            />
          </label>
          <button
            type="button"
            onClick={() => setStep('audience')}
            className="w-full flex items-center gap-3 px-4 py-3 text-left"
          >
            {visibility === 'PRIVATE' ? <Lock size={18} className="text-wx-muted" /> : <Users size={18} className="text-wx-muted" />}
            <span className="text-[15px]">Who can see</span>
            <span className={cn('flex-1 text-right text-sm truncate', restricted ? 'text-wx-green' : 'text-wx-muted')}>
              {restricted ? `${option.label}: ${summary}` : option.label}
            </span>
            <span className="text-wx-muted">›</span>
          </button>
        </div>
        {needsAudience && <p className="px-4 pt-2 text-xs text-red-500">Select at least one tag or contact.</p>}
        {create.isError && <p className="px-4 pt-2 text-sm text-red-500">{create.error.message}</p>}
      </div>
    </div>
  )
}

function AudiencePicker({
  visibility,
  tagIds,
  userIds,
  onChange,
  onDone,
}: {
  visibility: MomentVisibility
  tagIds: string[]
  userIds: string[]
  onChange: (v: MomentVisibility, tagIds: string[], userIds: string[]) => void
  onDone: () => void
}) {
  const { data: tagsData, isLoading } = useTags()
  const restricted = visibility === 'INCLUDE' || visibility === 'EXCLUDE'
  const toggleTag = (id: string) =>
    onChange(visibility, tagIds.includes(id) ? tagIds.filter((x) => x !== id) : [...tagIds, id], userIds)

  return (
    <div className="h-full flex flex-col bg-wx-bg">
      <header className="h-11 flex items-center justify-center bg-wx-panel border-b border-wx-border shrink-0 relative">
        <button type="button" onClick={onDone} className="absolute left-3 text-sm">←</button>
        <h1 className="font-medium">Who can see</h1>
        <button
          type="button"
          onClick={onDone}
          disabled={restricted && tagIds.length + userIds.length === 0}
          className="absolute right-3 bg-wx-green text-white text-sm px-3 py-1 rounded disabled:opacity-50"
        >
          Done
        </button>
      </header>
      <div className="flex-1 overflow-y-auto">
        <div className="bg-wx-panel mt-2">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value, tagIds, userIds)}
              className="w-full flex items-center gap-3 px-4 py-3 border-b border-wx-border text-left"
            >
              <span className="w-5 text-wx-green">{visibility === o.value && <Check size={18} />}</span>
              <span className="flex-1">
                <span className="block text-[15px]">{o.label}</span>
                <span className="block text-xs text-wx-muted">{o.hint}</span>
              </span>
            </button>
          ))}
        </div>
        {restricted && (
          <>
            <p className="px-4 pt-4 pb-1 text-xs text-wx-muted">Select from tags</p>
            <div className="bg-wx-panel">
              {isLoading && <p className="px-4 py-3 text-sm text-wx-muted">Loading tags…</p>}
              {tagsData && tagsData.tags.length === 0 && (
                <p className="px-4 py-3 text-sm text-wx-muted">No tags yet. Create them in Contacts → Tags.</p>
              )}
              {tagsData?.tags.map((t) => {
                const on = tagIds.includes(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTag(t.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 border-b border-wx-border text-left"
                  >
                    <span
                      className={cn(
                        'w-5 h-5 rounded-full border flex items-center justify-center shrink-0',
                        on ? 'bg-wx-green border-wx-green text-white' : 'border-wx-border',
                      )}
                    >
                      {on && <Check size={14} />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm">{t.name}</span>
                      <span className="block text-xs text-wx-muted truncate">
                        {t.members.map(displayName).join(', ') || 'No members'}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="px-4 pt-4 pb-1 text-xs text-wx-muted">Select from contacts</p>
            <ContactPicker selected={userIds} onChange={(ids) => onChange(visibility, tagIds, ids)} />
          </>
        )}
      </div>
    </div>
  )
}
