import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BadgeCheck, Bookmark, ChevronLeft, Clapperboard, LoaderCircle, Music2, Play, RefreshCw, Share2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/cn'
import { compactCount } from '@/lib/format'
import { SoundCover } from './SoundRow'
import { uploadWithSoundHref, type SoundSort } from './types'
import { useAudioPreview } from './useAudioPreview'
import { useSound, useSoundVideos, useToggleSoundFavorite } from './useSounds'

function SoundVideoGrid({ soundId, originalVideoId }: { soundId: string; originalVideoId: string | null }) {
  const [sort, setSort] = useState<SoundSort>('popular')
  const videos = useSoundVideos(soundId, sort)
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = videos
  const sentinel = useRef<HTMLDivElement>(null)
  const items = videos.data?.pages.flatMap((p) => p.items) ?? []

  // Load the next page as the end of the grid scrolls into view.
  useEffect(() => {
    const el = sentinel.current
    if (!el || !hasNextPage) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) fetchNextPage()
      },
      { rootMargin: '300px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const tab = (key: SoundSort, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={sort === key}
      onClick={() => setSort(key)}
      className={cn(
        'relative flex-1 py-3 text-sm font-semibold transition-colors',
        sort === key ? 'text-white' : 'text-white/50 hover:text-white/80',
      )}
    >
      {label}
      {sort === key && <span className="absolute bottom-0 left-1/2 h-0.5 w-12 -translate-x-1/2 bg-white" />}
    </button>
  )

  return (
    <section className="mt-5">
      <div role="tablist" className="flex border-b border-white/10">
        {tab('popular', 'Popular')}
        {tab('recent', 'Recent')}
      </div>
      {videos.isPending ? (
        <div className="grid grid-cols-3 gap-0.5 pt-0.5 sm:grid-cols-4">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse bg-white/5" />
          ))}
        </div>
      ) : videos.isError ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="font-semibold">Couldn&apos;t load videos</p>
          <p className="text-sm text-tt-muted">{videos.error.message}</p>
          <button
            type="button"
            onClick={() => videos.refetch()}
            className="mt-1 inline-flex items-center gap-2 rounded bg-white/10 px-4 py-2 text-sm font-semibold"
          >
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Music2 size={32} className="text-white/40" />
          <p className="font-semibold">No videos with this sound yet</p>
          <p className="text-sm text-tt-muted">Be the first to use it.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 pt-0.5 sm:grid-cols-4">
          {items.map((v) => (
            <Link
              key={v.id}
              to={`/video/${v.id}`}
              aria-label={`Video by @${v.author.username}`}
              className="group relative aspect-[3/4] overflow-hidden bg-white/10"
            >
              <img src={v.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
              <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
              {v.id === originalVideoId && (
                <span className="absolute left-1 top-1 rounded-sm bg-tt-primary px-1.5 py-0.5 text-[10px] font-bold">Original</span>
              )}
              <span className="absolute bottom-1 left-1.5 flex items-center gap-1 text-xs font-semibold drop-shadow">
                <Play size={12} fill="white" /> {compactCount(v.viewCount)}
              </span>
            </Link>
          ))}
        </div>
      )}
      <div ref={sentinel} className="flex h-16 items-center justify-center">
        {isFetchingNextPage && <LoaderCircle size={22} className="animate-spin text-white/60" />}
      </div>
    </section>
  )
}

export function SoundPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: sound, isPending, isError, error, refetch } = useSound(id)
  const favorite = useToggleSoundFavorite()
  const preview = useAudioPreview()
  const [toast, setToast] = useState<string | null>(null)

  const goBack = () => {
    // react-router stores the history index; fall back to the feed when the page was opened directly.
    if ((window.history.state as { idx?: number } | null)?.idx) navigate(-1)
    else navigate('/')
  }

  const onShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setToast('Link copied')
    } catch {
      setToast('Could not copy link')
    }
    window.setTimeout(() => setToast(null), 1500)
  }

  let body: React.ReactNode
  if (isPending) {
    body = (
      <div className="flex gap-4 px-4 pt-2" aria-busy="true">
        <div className="h-28 w-28 shrink-0 animate-pulse rounded-md bg-white/10 sm:h-36 sm:w-36" />
        <div className="flex-1 space-y-3 pt-1">
          <div className="h-5 w-3/4 animate-pulse rounded bg-white/10" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-white/10" />
        </div>
      </div>
    )
  } else if (isError) {
    const missing = error.message === 'Sound not found'
    body = (
      <div className="flex flex-col items-center gap-2 px-8 py-24 text-center">
        <Music2 size={40} className="text-white/40" />
        <p className="text-lg font-bold">{missing ? "This sound isn't available" : "Couldn't load this sound"}</p>
        <p className="text-sm text-tt-muted">{missing ? 'It may have been removed.' : error.message}</p>
        {missing ? (
          <Link to="/discover" className="mt-2 rounded bg-white/10 px-4 py-2 text-sm font-semibold">
            Discover sounds
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 inline-flex items-center gap-2 rounded bg-white/10 px-4 py-2 text-sm font-semibold"
          >
            <RefreshCw size={16} /> Retry
          </button>
        )}
      </div>
    )
  } else {
    const playing = preview.playingId === sound.id
    body = (
      <>
        <div className="flex gap-4 px-4 pt-2">
          <SoundCover
            sound={sound}
            playing={playing}
            onToggle={() => preview.toggle(sound.id, sound.audioUrl)}
            className="h-28 w-28 sm:h-36 sm:w-36"
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <h1 className="line-clamp-2 text-xl font-bold leading-tight sm:text-2xl">{sound.title}</h1>
            {sound.author ? (
              <Link
                to={`/@${sound.author.username}`}
                className="mt-1.5 inline-flex w-fit max-w-full items-center gap-1.5 text-sm font-semibold hover:underline"
              >
                <Avatar src={sound.author.avatarUrl} name={sound.author.firstName} size="sm" className="h-5 w-5" />
                <span className="truncate">
                  {sound.author.firstName} {sound.author.lastName}
                </span>
                {sound.author.verified && <BadgeCheck size={14} className="shrink-0 text-tt-secondary" />}
              </Link>
            ) : (
              <p className="mt-1.5 truncate text-sm font-semibold">{sound.artist}</p>
            )}
            <p className="mt-1 text-sm text-tt-muted">
              {compactCount(sound.videoCount)} {sound.videoCount === 1 ? 'video' : 'videos'}
            </p>
            {preview.failedId === sound.id && <p className="mt-1 text-xs text-tt-primary">Preview unavailable</p>}
            <button
              type="button"
              onClick={() => favorite.mutate(sound)}
              aria-pressed={sound.favorited}
              className={cn(
                'mt-3 inline-flex w-fit items-center gap-2 rounded border px-3 py-1.5 text-sm font-semibold transition-colors',
                sound.favorited ? 'border-white/10 bg-white/10' : 'border-white/25 hover:bg-white/5',
              )}
            >
              <Bookmark size={16} fill={sound.favorited ? '#facc15' : 'none'} className={sound.favorited ? 'text-yellow-400' : ''} />
              {sound.favorited ? 'Added to Favorites' : 'Add to Favorites'}
            </button>
          </div>
        </div>
        <SoundVideoGrid soundId={sound.id} originalVideoId={sound.originalVideoId} />
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center bg-gradient-to-t from-black via-black/80 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8">
          <Link
            to={uploadWithSoundHref(sound.id)}
            className="pointer-events-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-tt-primary py-3 text-[15px] font-semibold shadow-lg shadow-black/40 transition-transform active:scale-[0.98]"
          >
            <Clapperboard size={20} /> Use this sound
          </Link>
        </div>
      </>
    )
  }

  return (
    <div className="h-[100dvh] overflow-y-auto bg-black text-white">
      <audio {...preview.audioProps} />
      <div className="mx-auto max-w-3xl pb-28">
        <header className="sticky top-0 z-20 flex items-center justify-between bg-black/90 px-2 py-2 backdrop-blur">
          <button type="button" onClick={goBack} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10">
            <ChevronLeft size={26} />
          </button>
          {sound && (
            <button type="button" onClick={onShare} aria-label="Share sound" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10">
              <Share2 size={22} />
            </button>
          )}
        </header>
        {body}
      </div>
      {toast && (
        <div className="fixed left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 rounded-md bg-black/80 px-4 py-2 text-sm font-semibold">
          {toast}
        </div>
      )}
    </div>
  )
}
