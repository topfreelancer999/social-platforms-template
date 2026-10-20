import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Check, Pin, PinOff, Plus, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { authHeaders, useAuth } from '@/hooks/useAuth'
import { useUIStore } from '@/stores/uiStore'
import {
  MAX_PINNED_SKILLS,
  MAX_SKILL_NAME_LENGTH,
  MAX_SKILLS,
  SKILL_SUGGESTIONS,
  normalizeSkillName,
} from '@/lib/skills'
import type { SkillEndorser, SkillEndorsersResponse, SkillView, SkillsResponse } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { Spinner } from '@/components/ui/Spinner'

const fullName = (u: SkillEndorser) => `${u.firstName} ${u.lastName}`
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
const degreeLabel = (d: SkillEndorser['degree']) =>
  d === 1 ? '1st' : d === 2 ? '2nd' : d === 3 ? '3rd+' : null

function endorsementSummary(skill: SkillView) {
  const first = skill.endorsedByMe ? 'you' : skill.endorsers[0] && fullName(skill.endorsers[0])
  if (!first) return null
  const others = skill.endorsements - 1
  return others > 0 ? `Endorsed by ${first} and ${plural(others, 'other')}` : `Endorsed by ${first}`
}

export function SkillsSection({ username, firstName }: { username: string; firstName: string }) {
  const queryClient = useQueryClient()
  const showToast = useUIStore((s) => s.showToast)
  const [adding, setAdding] = useState(false)
  const [endorsersFor, setEndorsersFor] = useState<SkillView | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const queryKey = ['skills', username]

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => api<SkillsResponse>(`/users/${username}/skills`, { headers: authHeaders() }),
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey })
    // The About tab's "Top skills" reads the profile's skill list.
    queryClient.invalidateQueries({ queryKey: ['profile'] })
  }

  const endorse = useMutation({
    mutationFn: (skill: SkillView) =>
      api<SkillView>(`/users/${username}/skills/${skill.id}/endorse`, {
        method: skill.endorsedByMe ? 'DELETE' : 'POST',
        headers: authHeaders(),
      }),
    onSuccess: (view) => {
      // Update in place so the list doesn't reorder under the cursor.
      queryClient.setQueryData<SkillsResponse>(queryKey, (old) =>
        old && { ...old, skills: old.skills.map((s) => (s.id === view.id ? view : s)) },
      )
      queryClient.invalidateQueries({ queryKey: ['skill-endorsers', username, view.id] })
    },
    onError: (err) => {
      showToast(err.message)
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const pin = useMutation({
    mutationFn: (skill: SkillView) =>
      api<SkillView>(`/users/${username}/skills/${skill.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ pinned: !skill.pinned }),
      }),
    onSuccess: refresh,
    onError: (err) => showToast(err.message),
  })

  const remove = useMutation({
    mutationFn: (skill: SkillView) =>
      api(`/users/${username}/skills/${skill.id}`, { method: 'DELETE', headers: authHeaders() }),
    onSuccess: (_res, skill) => {
      setConfirmRemove(null)
      showToast(`${skill.name} removed`)
      refresh()
    },
    onError: (err) => showToast(err.message),
  })

  const skills = data?.skills ?? []
  const isOwner = Boolean(data?.isOwner)
  const pinnedCount = skills.filter((s) => s.pinned).length

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 className="font-semibold">Skills</h2>
        {isOwner && !adding && skills.length < MAX_SKILLS && (
          <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
            <Plus size={16} className="mr-1" /> Add skill
          </Button>
        )}
      </div>
      {isOwner && (
        <p className="text-xs text-linkedin-muted mb-3">
          Pin up to {MAX_PINNED_SKILLS} top skills · {skills.length}/{MAX_SKILLS} skills
        </p>
      )}
      {data && !isOwner && !data.canEndorse && skills.length > 0 && (
        <p className="text-xs text-linkedin-muted mb-3">
          Only {firstName}&apos;s 1st-degree connections can endorse these skills.
        </p>
      )}

      {adding && (
        <AddSkillForm
          username={username}
          existing={skills.map((s) => s.name)}
          onDone={(name) => {
            setAdding(false)
            if (name) {
              showToast(`${name} added to your skills`)
              refresh()
            }
          }}
        />
      )}

      {isLoading && (
        <div className="space-y-4 py-2" aria-label="Loading skills">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="py-6 text-center text-sm text-linkedin-muted">
          <p>Couldn&apos;t load skills.</p>
          <Button variant="secondary" size="sm" className="mt-2" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}

      {data && skills.length === 0 && !adding && (
        <p className="py-4 text-sm text-linkedin-muted">
          {isOwner
            ? 'Add skills to show what you’re great at — your connections can endorse them.'
            : `${firstName} hasn’t added any skills yet.`}
        </p>
      )}

      <ul className="divide-y divide-linkedin-border">
        {skills.map((skill) => {
          const summary = endorsementSummary(skill)
          const endorsing = endorse.isPending && endorse.variables?.id === skill.id
          return (
            <li key={skill.id} className="py-3 flex gap-3 items-start" data-testid="skill-row">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold break-words min-w-0">{skill.name}</p>
                  {skill.pinned && (
                    <span className="text-[11px] leading-4 px-2 py-0.5 rounded-full bg-blue-50 text-linkedin-primary font-semibold">
                      Top skill
                    </span>
                  )}
                </div>
                {skill.endorsements > 0 ? (
                  <button
                    type="button"
                    onClick={() => setEndorsersFor(skill)}
                    className="mt-1 flex items-center gap-2 text-left text-sm text-linkedin-muted hover:text-linkedin-primary group"
                    aria-label={`See ${plural(skill.endorsements, 'endorsement')} for ${skill.name}`}
                  >
                    <span className="flex -space-x-2 shrink-0">
                      {skill.endorsers.map((u) => (
                        <Avatar
                          key={u.id}
                          src={u.avatarUrl}
                          name={fullName(u)}
                          size="sm"
                          className="h-6 w-6 border-2 border-white"
                        />
                      ))}
                    </span>
                    <span className="min-w-0">
                      <span className="font-semibold text-linkedin-text group-hover:text-linkedin-primary group-hover:underline">
                        {plural(skill.endorsements, 'endorsement')}
                      </span>
                      {summary && <span className="block text-xs">{summary}</span>}
                    </span>
                  </button>
                ) : (
                  <p className="mt-1 text-sm text-linkedin-muted">No endorsements yet</p>
                )}
                {skill.colleagueHighlight && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-linkedin-muted">
                    <Building2 size={14} className="shrink-0" />
                    Endorsed by {plural(skill.colleagueHighlight.count, 'colleague')} at{' '}
                    {skill.colleagueHighlight.company}
                  </p>
                )}
              </div>

              {data?.canEndorse && (
                <Button
                  variant={skill.endorsedByMe ? 'outline' : 'secondary'}
                  size="sm"
                  className="shrink-0"
                  aria-pressed={skill.endorsedByMe}
                  disabled={endorsing}
                  onClick={() => endorse.mutate(skill)}
                  title={skill.endorsedByMe ? 'Click to remove your endorsement' : undefined}
                >
                  {skill.endorsedByMe ? (
                    <>
                      <Check size={16} className="mr-1" /> Endorsed
                    </>
                  ) : (
                    'Endorse'
                  )}
                </Button>
              )}

              {isOwner &&
                (confirmRemove === skill.id ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="danger"
                      size="sm"
                      className="px-3"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(skill)}
                    >
                      Remove
                    </Button>
                    <Button variant="ghost" size="sm" className="px-3" onClick={() => setConfirmRemove(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center shrink-0 text-linkedin-muted">
                    <button
                      type="button"
                      className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-40"
                      disabled={pin.isPending || (!skill.pinned && pinnedCount >= MAX_PINNED_SKILLS)}
                      onClick={() => pin.mutate(skill)}
                      aria-label={skill.pinned ? `Unpin ${skill.name}` : `Pin ${skill.name} as a top skill`}
                      title={
                        skill.pinned
                          ? 'Remove from top skills'
                          : pinnedCount >= MAX_PINNED_SKILLS
                            ? `You can pin up to ${MAX_PINNED_SKILLS} top skills`
                            : 'Pin as a top skill'
                      }
                    >
                      {skill.pinned ? <PinOff size={18} /> : <Pin size={18} />}
                    </button>
                    <button
                      type="button"
                      className="p-2 rounded-full hover:bg-gray-100"
                      onClick={() => setConfirmRemove(skill.id)}
                      aria-label={`Remove ${skill.name}`}
                      title="Remove skill"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
            </li>
          )
        })}
      </ul>

      <EndorsersModal
        username={username}
        skill={endorsersFor}
        onClose={() => setEndorsersFor(null)}
      />
    </div>
  )
}

function AddSkillForm({
  username,
  existing,
  onDone,
}: {
  username: string
  existing: string[]
  onDone: (added?: string) => void
}) {
  const [value, setValue] = useState('')
  const taken = new Set(existing.map((n) => n.toLowerCase()))
  const name = normalizeSkillName(value)
  const duplicate = existing.find((n) => n.toLowerCase() === name.toLowerCase())

  const add = useMutation({
    mutationFn: (skillName: string) =>
      api<SkillView>(`/users/${username}/skills`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name: skillName }),
      }),
    onSuccess: (skill) => onDone(skill.name),
  })

  const query = name.toLowerCase()
  const suggestions = SKILL_SUGGESTIONS.filter(
    (s) => !taken.has(s.toLowerCase()) && s.toLowerCase().includes(query) && s.toLowerCase() !== query,
  ).slice(0, 6)

  const clientError = duplicate ? `${duplicate} is already on your profile` : null
  const error = clientError ?? (add.isError ? add.error.message : null)

  return (
    <form
      className="mb-4 rounded-lg border border-linkedin-border p-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (name && !duplicate) add.mutate(name)
      }}
    >
      <label htmlFor="new-skill" className="block text-sm font-semibold mb-1">
        Add a skill
      </label>
      <input
        id="new-skill"
        autoFocus
        autoComplete="off"
        value={value}
        maxLength={MAX_SKILL_NAME_LENGTH}
        placeholder="Skill (ex: Project Management)"
        onChange={(e) => {
          setValue(e.target.value)
          if (add.isError) add.reset()
        }}
        className="w-full rounded px-3 py-2 text-sm border border-linkedin-border focus:border-linkedin-primary focus:outline-none focus:ring-1 focus:ring-linkedin-primary"
        aria-invalid={Boolean(error)}
        aria-describedby="new-skill-hint"
      />
      <p id="new-skill-hint" className={error ? 'mt-1 text-xs text-red-600' : 'mt-1 text-xs text-linkedin-muted'}>
        {error ?? `${value.length}/${MAX_SKILL_NAME_LENGTH}`}
      </p>
      {suggestions.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-linkedin-muted mb-1">{query ? 'Suggestions' : 'Suggested skills'}</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                disabled={add.isPending}
                onClick={() => add.mutate(s)}
                className="px-3 py-1 rounded-full border border-linkedin-border text-sm hover:bg-gray-100 disabled:opacity-50"
              >
                <Plus size={14} className="inline -mt-0.5 mr-0.5" />
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => onDone()}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!name || Boolean(duplicate) || add.isPending}>
          {add.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  )
}

function EndorsersModal({
  username,
  skill,
  onClose,
}: {
  username: string
  skill: SkillView | null
  onClose: () => void
}) {
  const { user: me } = useAuth()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['skill-endorsers', username, skill?.id],
    queryFn: () =>
      api<SkillEndorsersResponse>(`/users/${username}/skills/${skill!.id}/endorsers`, {
        headers: authHeaders(),
      }),
    enabled: Boolean(skill),
  })

  return (
    <Modal open={Boolean(skill)} onClose={onClose} title={skill ? `${skill.name} endorsements` : undefined}>
      {isLoading && <Spinner className="mx-auto" />}
      {isError && (
        <div className="text-center text-sm text-linkedin-muted">
          <p>Couldn&apos;t load endorsements.</p>
          <Button variant="secondary" size="sm" className="mt-2" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}
      {data && data.items.length === 0 && (
        <p className="text-sm text-linkedin-muted">No endorsements yet.</p>
      )}
      {data && data.items.length > 0 && (
        <ul className="-my-2 divide-y divide-linkedin-border">
          {data.items.map((u) => (
            <li key={u.id}>
              <Link
                to={`/in/${u.username}`}
                onClick={onClose}
                className="flex items-center gap-3 py-3 hover:bg-gray-50 -mx-2 px-2 rounded"
              >
                <Avatar src={u.avatarUrl} name={fullName(u)} />
                <div className="min-w-0">
                  <p className="font-semibold text-sm hover:underline">
                    {fullName(u)}
                    {degreeLabel(u.degree) && (
                      <span className="font-normal text-linkedin-muted"> · {degreeLabel(u.degree)}</span>
                    )}
                    {u.id === me?.id && <span className="font-normal text-linkedin-muted"> · You</span>}
                  </p>
                  <p className="text-xs text-linkedin-muted truncate">{u.headline}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
