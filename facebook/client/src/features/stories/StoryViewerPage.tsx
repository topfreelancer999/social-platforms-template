import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Eye, Globe, Loader2, Pause, Play, Send, Trash2, Users, X } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { REACTIONS, REACTION_EMOJI } from '@/lib/constants'
import { cn } from '@/lib/cn'
import { StoryViewersSheet } from './StoryViewersSheet'
import {
  STORY_DURATION_MS,
  backgroundCss,
  patchStoryGroups,
  removeStory,
  shortAge,
  trayQuery,
  updateStory,
  userStoriesQuery,
  type StoryGroup,
} from './stories'

/** Taps shorter than this navigate; longer presses just pause while held. */
const TAP_MS = 250

function StoryPlayer({ group, hasPrev, onPrevAuthor, onNextAuthor, onClose }: {
  group: StoryGroup
  hasPrev: boolean
  onPrevAuthor: () => void
  onNextAuthor: () => void
  onClose: () => void
}) {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  // Start at the first story not watched yet, like Facebook does.
  const [index, setIndex] = useState(() => Math.max(0, group.stories.findIndex((s) => !s.seen)))
  const [paused, setPaused] = useState(false)
  const [holding, setHolding] = useState(false)
  const [hoverControls, setHoverControls] = useState(false)
  const [typing, setTyping] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const downAt = useRef(0)

  const i = Math.min(index, group.stories.length - 1)
  const story = group.stories[i]
  const ready = story.type === 'TEXT' || loadedId === story.id
  const stopped = paused || holding || hoverControls || typing || sheetOpen || confirmDelete || !ready

  const flash = (text: string) => {
    setToast(text)
    setTimeout(() => setToast((t) => (t === text ? null : t)), 2000)
  }

  const markViewed = useMutation({
    mutationFn: (id: string) => api(`/stories/${id}/view`, { method: 'POST', headers: authHeaders(token) }),
    // Optimistic: flip the seen flag in place without reordering the tray mid-session.
    onMutate: (id) => patchStoryGroups(qc, updateStory(id, { seen: true })),
  })
  const react = useMutation({
    mutationFn: (type: string) => api(`/stories/${story.id}/react`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ type }) }),
    onSuccess: (_d, type) => {
      patchStoryGroups(qc, updateStory(story.id, { myReaction: type, seen: true }))
      flash(`${REACTION_EMOJI[type]} sent to ${group.author.firstName}`)
    },
    onError: (e) => flash(e.message),
  })
  const sendReply = useMutation({
    mutationFn: () => api(`/stories/${story.id}/reply`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ content: reply }) }),
    onSuccess: () => {
      setReply('')
      setTyping(false)
      flash(`Reply sent to ${group.author.firstName} in Messenger`)
      qc.invalidateQueries({ queryKey: ['threads'] })
    },
    onError: (e) => flash(e.message),
  })
  const remove = useMutation({
    mutationFn: (id: string) => api(`/stories/${id}`, { method: 'DELETE', headers: authHeaders(token) }),
    onSuccess: (_d, id) => {
      setConfirmDelete(false)
      if (group.stories.length === 1) onNextAuthor()
      patchStoryGroups(qc, removeStory(id))
    },
    onError: (e) => { setConfirmDelete(false); flash(e.message) },
  })

  const goNext = () => (i < group.stories.length - 1 ? setIndex(i + 1) : onNextAuthor())
  const goPrev = () => (i > 0 ? setIndex(i - 1) : onPrevAuthor())

  const onViewed = useEffectEvent((s: typeof story) => {
    if (!group.isSelf && !s.seen) markViewed.mutate(s.id)
  })
  useEffect(() => { onViewed(story) }, [story])

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (sheetOpen) setSheetOpen(false)
      else if (confirmDelete) setConfirmDelete(false)
      else onClose()
      return
    }
    // Leave arrow keys and space alone while typing a reply.
    if (e.target instanceof HTMLInputElement) return
    if (e.key === 'ArrowRight') goNext()
    else if (e.key === 'ArrowLeft') goPrev()
    else if (e.key === ' ') { e.preventDefault(); setPaused((p) => !p) }
  })
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const AudienceIcon = story.audience === 'PUBLIC' ? Globe : Users

  return (
    <div className="flex items-center gap-4">
      <button onClick={goPrev} disabled={!hasPrev && i === 0} aria-label="Previous story" className="hidden md:flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 disabled:invisible">
        <ChevronLeft size={28} />
      </button>
      <div
        className="relative h-dvh w-screen sm:h-[min(92dvh,860px)] sm:w-auto sm:aspect-[9/16] sm:rounded-xl overflow-hidden bg-[#1c1e21] select-none"
        data-testid="story-player"
        data-story-id={story.id}
      >
        {/* Content */}
        {story.type === 'PHOTO' && story.mediaUrl ? (
          <>
            <img src={story.mediaUrl} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover blur-2xl opacity-50 scale-110" />
            <img
              key={story.id}
              src={story.mediaUrl}
              alt={story.text ?? `${group.author.firstName}'s story`}
              onLoad={() => setLoadedId(story.id)}
              onError={() => setLoadedId(story.id)}
              className="absolute inset-0 h-full w-full object-contain"
              draggable={false}
            />
            {!ready && <Loader2 className="absolute left-1/2 top-1/2 -ml-4 -mt-4 animate-spin text-white" size={32} />}
            {story.text && (
              <p className="absolute inset-x-6 bottom-28 text-center text-lg font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{story.text}</p>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-8" style={{ background: backgroundCss(story.background) }}>
            <p className={cn('text-center font-bold text-white break-words whitespace-pre-wrap', (story.text?.length ?? 0) > 80 ? 'text-2xl' : 'text-[32px] leading-tight')}>{story.text}</p>
          </div>
        )}

        {/* Tap zones: left third = previous, rest = next; press and hold to pause. */}
        <div
          className="absolute inset-0 z-10 touch-manipulation"
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={() => { downAt.current = Date.now(); setHolding(true) }}
          onPointerUp={(e) => {
            setHolding(false)
            if (Date.now() - downAt.current > TAP_MS) return
            const rect = e.currentTarget.getBoundingClientRect()
            if (e.clientX - rect.left < rect.width / 3) goPrev()
            else goNext()
          }}
          onPointerLeave={() => setHolding(false)}
          onPointerCancel={() => setHolding(false)}
          data-testid="story-tap"
        />

        {/* Header: progress segments, author and controls */}
        <div className="absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/60 to-transparent px-3 pt-3 pb-8">
          <div className="flex gap-1" data-testid="story-progress">
            {group.stories.map((s, n) => (
              <div key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/40">
                {n < i && <div className="h-full w-full bg-white" />}
                {n === i && (
                  <div
                    key={s.id}
                    className="h-full w-full origin-left bg-white animate-story-progress"
                    style={{ animationDuration: `${STORY_DURATION_MS}ms`, animationPlayState: stopped ? 'paused' : 'running' }}
                    onAnimationEnd={goNext}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-white">
            <Link to={`/profile/${group.author.username}`} className="flex min-w-0 items-center gap-2">
              <img src={group.author.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full border-2 border-fb-primary object-cover" />
              <span className="truncate text-sm font-semibold">{group.isSelf ? 'Your story' : `${group.author.firstName} ${group.author.lastName}`}</span>
            </Link>
            <span className="shrink-0 text-sm text-white/80">{shortAge(story.createdAt)}</span>
            <AudienceIcon size={14} className="shrink-0 text-white/80" aria-label={story.audience === 'PUBLIC' ? 'Public' : 'Friends'} />
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Play' : 'Pause'} className="rounded-full p-2 hover:bg-white/15">
                {paused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
              </button>
              {group.isSelf && (
                <button onClick={() => setConfirmDelete(true)} aria-label="Delete story" className="rounded-full p-2 hover:bg-white/15"><Trash2 size={20} /></button>
              )}
              <button onClick={onClose} aria-label="Close stories" className="rounded-full p-2 hover:bg-white/15"><X size={22} /></button>
            </div>
          </div>
        </div>

        {/* Footer: viewers for the author, reply + reactions for everyone else */}
        <div
          className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/60 to-transparent px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-10"
          onMouseEnter={() => setHoverControls(true)}
          onMouseLeave={() => setHoverControls(false)}
        >
          {group.isSelf ? (
            <button onClick={() => setSheetOpen(true)} className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-white hover:bg-white/15" data-testid="story-viewers-button">
              <Eye size={18} /> {story.viewerCount ?? 0} {story.viewerCount === 1 ? 'viewer' : 'viewers'}
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => { e.preventDefault(); if (reply.trim() && !sendReply.isPending) sendReply.mutate() }}
              >
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onFocus={() => setTyping(true)}
                  onBlur={() => setTyping(false)}
                  maxLength={1000}
                  placeholder="Reply…"
                  aria-label={`Reply to ${group.author.firstName}`}
                  className="min-w-0 flex-1 rounded-full border border-white/60 bg-transparent px-4 py-2 text-sm text-white placeholder:text-white/80 focus:outline-none focus:border-white"
                />
                <button type="submit" disabled={!reply.trim() || sendReply.isPending} aria-label="Send reply" className="rounded-full p-2 text-white hover:bg-white/15 disabled:opacity-40">
                  <Send size={20} />
                </button>
              </form>
              <div className="flex justify-between sm:justify-center sm:gap-3">
                {REACTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => react.mutate(r)}
                    disabled={react.isPending}
                    aria-label={`React ${r.toLowerCase()}`}
                    aria-pressed={story.myReaction === r}
                    className={cn('rounded-full p-1 text-[28px] leading-none transition-transform hover:scale-125 active:scale-95', story.myReaction === r && 'bg-white/25')}
                  >
                    {REACTION_EMOJI[r]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {toast && (
          <div className="absolute left-1/2 top-24 z-30 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/75 px-4 py-2 text-sm text-white" role="status">{toast}</div>
        )}

        {confirmDelete && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-6">
            <div className="w-full max-w-xs rounded-xl bg-fb-card p-4 text-fb-text shadow-xl" role="alertdialog" aria-label="Delete story">
              <p className="font-bold">Delete story?</p>
              <p className="mt-1 text-sm text-fb-muted">This story will be removed for everyone. Replies stay in your chats.</p>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setConfirmDelete(false)} className="rounded-lg px-3 py-2 text-sm font-semibold text-fb-primary hover:bg-[#f0f2f5]">Cancel</button>
                <button onClick={() => remove.mutate(story.id)} disabled={remove.isPending} className="rounded-lg bg-fb-primary px-3 py-2 text-sm font-semibold text-white hover:bg-fb-primary-hover disabled:opacity-50">
                  {remove.isPending ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {sheetOpen && <StoryViewersSheet storyId={story.id} onClose={() => setSheetOpen(false)} />}
      </div>
      <button onClick={goNext} aria-label="Next story" className="hidden md:flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25">
        <ChevronRight size={28} />
      </button>
    </div>
  )
}

/** Full-screen story viewer at /stories/:userId; walks through the tray author by author. */
export function StoryViewerPage() {
  const { userId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const token = useAuthStore((s) => s.accessToken)
  const tray = useQuery(trayQuery(token))
  const inTray = tray.data?.some((g) => g.author.id === userId && g.stories.length > 0)
  // Authors outside the tray (e.g. a public story opened from a profile) are loaded on their own.
  const single = useQuery({ ...userStoriesQuery(token, userId), enabled: tray.isSuccess && !inTray })
  const groups = (inTray ? tray.data! : single.data ? [single.data] : []).filter((g) => g.stories.length > 0)
  const pos = groups.findIndex((g) => g.author.id === userId)
  const from = (location.state as { from?: string } | null)?.from

  // Re-sort the tray (unseen first) once the viewer closes.
  useEffect(() => () => { qc.invalidateQueries({ queryKey: ['stories'] }) }, [qc])

  const close = () => (from ? navigate(-1) : navigate('/', { replace: true }))
  const goAuthor = (n: number) => {
    const next = groups[n]
    if (!next) return close()
    navigate(`/stories/${next.author.id}`, { replace: true, state: location.state })
  }

  const loading = tray.isLoading || (!inTray && single.isLoading)
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0a0a0a]">
      {loading ? (
        <Loader2 className="animate-spin text-white" size={36} />
      ) : pos === -1 ? (
        <div className="px-6 text-center text-white">
          <p className="text-lg font-semibold">This story isn&apos;t available</p>
          <p className="mt-1 text-sm text-white/70">It may have expired, been deleted, or you don&apos;t have permission to see it.</p>
          <button onClick={close} className="mt-4 rounded-lg bg-fb-primary px-4 py-2 text-sm font-semibold">Back to Feed</button>
        </div>
      ) : (
        <StoryPlayer
          key={userId}
          group={groups[pos]}
          hasPrev={pos > 0}
          onPrevAuthor={() => pos > 0 && goAuthor(pos - 1)}
          onNextAuthor={() => goAuthor(pos + 1)}
          onClose={close}
        />
      )}
    </div>
  )
}
