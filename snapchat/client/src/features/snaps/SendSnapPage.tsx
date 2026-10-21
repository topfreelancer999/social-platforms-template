import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, Image as ImageIcon, Send, Type } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { timeLeft } from '@/lib/format'
import type { SnapKind, Streak } from '@/lib/snaps'
import { useAuthStore } from '@/stores/authStore'
import { StreakBadge } from '@/components/ui/StreakBadge'

const PHOTOS = [
  'https://picsum.photos/seed/cam1/540/960',
  'https://picsum.photos/seed/cam2/540/960',
  'https://picsum.photos/seed/cam3/540/960',
  'https://picsum.photos/seed/cam4/540/960',
]
const COLORS = ['#a855f7', '#f23c57', '#00b4ff', '#16a34a', '#f59e0b']
const MAX_TEXT = 250

type Friend = { id: string; username: string; displayName?: string; avatarUrl: string; streak: Streak | null }

/** Compose a photo or colored text Snap and send it to one or more friends. */
export function SendSnapPage() {
  const [params] = useSearchParams()
  const token = useAuthStore((s) => s.accessToken)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [kind, setKind] = useState<SnapKind>('PHOTO')
  const [imageUrl, setImageUrl] = useState(() => {
    const fromCamera = params.get('image')
    return fromCamera && PHOTOS.includes(fromCamera) ? fromCamera : PHOTOS[0]
  })
  const [text, setText] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [selected, setSelected] = useState<string[]>(() => {
    const to = params.get('to')
    return to ? [to] : []
  })

  const friends = useQuery({
    queryKey: ['friends'],
    queryFn: () => api<{ friends: Friend[] }>('/friends', { headers: authHeaders(token!) }),
    enabled: !!token,
  })

  const send = useMutation({
    mutationFn: () =>
      api('/snaps/send', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(
          kind === 'PHOTO'
            ? { kind, imageUrl, recipientIds: selected }
            : { kind, text: text.trim(), color, recipientIds: selected },
        ),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox'] })
      qc.invalidateQueries({ queryKey: ['friends'] })
      qc.invalidateQueries({ queryKey: ['profile'] })
      navigate('/chat')
    },
  })

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const ready = selected.length > 0 && (kind === 'PHOTO' || text.trim().length > 0)
  const list = friends.data?.friends ?? []
  // Name the recipients on the (sticky) button: a preselected friend may be scrolled out of view.
  const names = list.filter((f) => selected.includes(f.id)).map((f) => f.displayName || f.username)
  const sendLabel = names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ')

  return (
    <div className="p-4">
      <header className="mb-4 flex items-center gap-3">
        <Link to="/chat" aria-label="Back to Chat" className="text-white/60">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-xl font-bold">Send a Snap</h1>
      </header>

      <div className="mb-3 flex gap-2" role="tablist" aria-label="Snap type">
        {(
          [
            ['PHOTO', 'Photo', ImageIcon],
            ['TEXT', 'Text', Type],
          ] as const
        ).map(([k, label, Icon]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kind === k}
            onClick={() => setKind(k)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ${
              kind === k ? 'bg-[var(--sc-yellow)] text-black' : 'bg-white/10'
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {kind === 'PHOTO' ? (
        <div>
          <div className="mx-auto aspect-[9/16] max-h-[38vh] overflow-hidden rounded-xl bg-zinc-900">
            <img src={imageUrl} alt="Snap preview" className="h-full w-full object-cover" />
          </div>
          <div className="mt-2 flex justify-center gap-2">
            {PHOTOS.map((url) => (
              <button
                key={url}
                type="button"
                aria-label="Use this photo"
                aria-pressed={imageUrl === url}
                onClick={() => setImageUrl(url)}
                className={`h-12 w-12 overflow-hidden rounded-lg border-2 ${
                  imageUrl === url ? 'border-[var(--sc-yellow)]' : 'border-transparent'
                }`}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div
            className="mx-auto flex aspect-[9/16] max-h-[38vh] items-center justify-center rounded-xl p-6"
            style={{ background: color }}
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT))}
              placeholder="Type something…"
              aria-label="Snap text"
              rows={4}
              className="w-full resize-none bg-transparent text-center text-2xl font-bold text-white outline-none placeholder:text-white/60"
            />
          </div>
          <div className="mt-2 flex items-center justify-center gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Background ${c}`}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-full border-2 ${color === c ? 'border-white' : 'border-transparent'}`}
                style={{ background: c }}
              />
            ))}
            <span className="ml-2 text-xs text-white/50">
              {text.length}/{MAX_TEXT}
            </span>
          </div>
        </div>
      )}

      <section className="mt-5">
        <h2 className="mb-2 text-sm font-semibold text-white/70">Send to</h2>
        {friends.isLoading && <p className="text-sm text-white/50">Loading friends…</p>}
        {friends.isError && <p className="text-sm text-red-300">Couldn't load friends: {friends.error.message}</p>}
        {friends.data && !list.length && (
          <p className="text-sm text-white/50">
            Add friends first —{' '}
            <Link to="/search?tab=users" className="text-[var(--sc-yellow)]">
              find people
            </Link>
          </p>
        )}
        <ul className="space-y-1">
          {list.map((f) => {
            const on = selected.includes(f.id)
            return (
              <li key={f.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(f.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/5"
                >
                  <img src={f.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{f.displayName || f.username}</span>
                      <StreakBadge streak={f.streak} />
                    </span>
                    {f.streak?.hourglass && f.streak.visible && (
                      <span className="block text-xs text-amber-300">
                        Streak ends in {timeLeft(f.streak.expiresAt)} — Snap now!
                      </span>
                    )}
                  </span>
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                      on ? 'border-[var(--sc-blue)] bg-[var(--sc-blue)]' : 'border-white/30'
                    }`}
                  >
                    {on && <Check size={14} strokeWidth={3} />}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      {send.isError && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {send.error.message}
        </p>
      )}

      <button
        type="button"
        disabled={!ready || send.isPending}
        onClick={() => send.mutate()}
        className="sticky bottom-24 mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--sc-blue)] px-4 py-3 font-semibold disabled:opacity-40"
      >
        <Send size={18} />
        <span className="truncate">
          {send.isPending ? 'Sending…' : names.length ? `Send to ${sendLabel}` : 'Pick friends'}
        </span>
      </button>
    </div>
  )
}
