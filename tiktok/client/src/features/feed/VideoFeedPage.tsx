import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, LoaderCircle, RefreshCw, Search, Tv, Users } from 'lucide-react'
import { BottomNav } from '@/components/layout/BottomNav'
import { Avatar } from '@/components/ui/Avatar'
import { usePlayerStore } from '@/stores/playerStore'
import { cn } from '@/lib/cn'
import type { FeedTab, VideoItem } from './types'
import { VideoSlide } from './VideoSlide'
import { newFeedSeed, useFollowCreator, useSuggestedCreators, useVideoFeed } from './useVideoFeed'

/** Start loading the next page when this many slides remain. */
const PREFETCH_REMAINING = 3

function FeedTabs({ tab, onReselect }: { tab: FeedTab; onReselect: () => void }) {
  const item = (key: FeedTab, to: string, label: string) => (
    <Link
      to={to}
      replace
      onClick={(e) => {
        if (key === tab) {
          e.preventDefault()
          onReselect()
        }
      }}
      className={cn(
        'relative pb-1.5 text-[17px] font-semibold transition-colors',
        key === tab ? 'text-white' : 'text-white/60 hover:text-white/80',
      )}
    >
      {label}
      {key === tab && <span className="absolute left-1/2 bottom-0 h-[3px] w-7 -translate-x-1/2 rounded-full bg-white" />}
    </Link>
  )
  return (
    <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-3 pb-6 bg-gradient-to-b from-black/50 to-transparent">
      <Link to="/live" aria-label="LIVE" className="text-white/90">
        <Tv size={24} />
      </Link>
      <nav className="flex items-center gap-5" aria-label="Feed tabs">
        {item('following', '/following', 'Following')}
        {item('for-you', '/', 'For You')}
      </nav>
      <Link to="/discover" aria-label="Search" className="text-white/90">
        <Search size={24} />
      </Link>
    </header>
  )
}

function CenteredState({ children, index }: { children: React.ReactNode; index?: number }) {
  return (
    <div data-index={index} className="snap-item h-[100dvh] flex flex-col items-center justify-center gap-3 px-8 text-center text-white">
      {children}
    </div>
  )
}

function FollowingEmptyState({ followsAnyone }: { followsAnyone: boolean }) {
  const { data, isPending } = useSuggestedCreators(true)
  const follow = useFollowCreator()
  const suggestions = data?.suggestions ?? []
  return (
    <div className="snap-item h-[100dvh] overflow-y-auto no-scrollbar flex flex-col items-center px-6 pt-24 pb-24 text-center text-white">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
        <Users size={32} />
      </div>
      <h2 className="mt-4 text-lg font-bold">
        {followsAnyone ? 'No new videos from people you follow' : 'Follow accounts to see their latest videos here'}
      </h2>
      <p className="mt-1 text-sm text-tt-muted">
        {followsAnyone ? 'Check back later, or find more creators below.' : 'Start with some popular creators.'}
      </p>
      <div className="mt-6 grid w-full max-w-md grid-cols-2 gap-3">
        {isPending &&
          Array.from({ length: 4 }, (_, i) => <div key={i} className="h-44 rounded-lg bg-white/5 animate-pulse" />)}
        {suggestions.slice(0, 6).map((u) => (
          <div key={u.id} className="flex flex-col items-center rounded-lg bg-white/5 p-3">
            <Link to={`/@${u.username}`}>
              <Avatar src={u.avatarUrl} name={u.firstName} size="lg" className="h-16 w-16" />
            </Link>
            <Link to={`/@${u.username}`} className="mt-2 w-full truncate text-sm font-semibold">
              {u.firstName} {u.lastName}
            </Link>
            <span className="w-full truncate text-xs text-tt-muted">@{u.username}</span>
            <button
              type="button"
              disabled={follow.isPending && follow.variables === u.id}
              onClick={() => follow.mutate(u.id)}
              className="mt-3 w-full rounded bg-tt-primary py-1.5 text-sm font-semibold disabled:opacity-60"
            >
              Follow
            </button>
          </div>
        ))}
      </div>
      <Link to="/" replace className="mt-6 text-sm font-semibold text-tt-secondary">
        Watch For You instead
      </Link>
    </div>
  )
}

export function VideoFeedPage({ tab }: { tab: FeedTab }) {
  const [seed] = useState(newFeedSeed)
  const feed = useVideoFeed(tab, seed)
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = feed
  const toggleMuted = usePlayerStore((s) => s.toggleMuted)
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  // Cursor pages can overlap when ranking shifts between requests; keep the first occurrence.
  const videos = useMemo(() => {
    const seen = new Set<string>()
    const out: VideoItem[] = []
    for (const page of data?.pages ?? []) {
      for (const v of page.items) {
        if (seen.has(v.id)) continue
        seen.add(v.id)
        out.push(v)
      }
    }
    return out
  }, [data])
  const followingCount = data?.pages[0]?.followingCount ?? 0

  // Whichever slide is ≥60% visible becomes active (plays); the rest pause.
  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveIndex(Number((entry.target as HTMLElement).dataset.index))
        }
      },
      { root, threshold: 0.6 },
    )
    root.querySelectorAll('[data-index]').forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [videos.length])

  // Infinite loading a few slides ahead.
  useEffect(() => {
    if (videos.length > 0 && activeIndex >= videos.length - PREFETCH_REMAINING && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [activeIndex, videos.length, hasNextPage, isFetchingNextPage, fetchNextPage])

  const scrollToIndex = useCallback((index: number) => {
    const root = containerRef.current
    if (!root) return
    const target = root.querySelector<HTMLElement>(`[data-index="${index}"]`)
    root.scrollTo({ top: target?.offsetTop ?? 0, behavior: 'smooth' })
  }, [])

  const onReselect = useCallback(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    refetch()
  }, [refetch])

  // Desktop keyboard: ↑/↓ (or k/j) to move, space to play/pause, m to mute.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault()
        scrollToIndex(Math.min(activeIndex + 1, videos.length))
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault()
        scrollToIndex(Math.max(activeIndex - 1, 0))
      } else if (e.key === ' ' && !target?.closest('button, a')) {
        e.preventDefault()
        const video = containerRef.current?.querySelector<HTMLVideoElement>(`[data-index="${activeIndex}"] video`)
        if (video) {
          if (video.paused) video.play().catch(() => {})
          else video.pause()
        }
      } else if (e.key === 'm') {
        toggleMuted()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeIndex, videos.length, scrollToIndex, toggleMuted])

  let body: React.ReactNode
  if (feed.isPending) {
    body = (
      <CenteredState>
        <LoaderCircle size={36} className="animate-spin text-white/70" />
      </CenteredState>
    )
  } else if (feed.isError && videos.length === 0) {
    body = (
      <CenteredState>
        <p className="font-semibold">Couldn&apos;t load videos</p>
        <p className="text-sm text-tt-muted">{feed.error.message}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-2 inline-flex items-center gap-2 rounded bg-white/10 px-4 py-2 text-sm font-semibold"
        >
          <RefreshCw size={16} /> Retry
        </button>
      </CenteredState>
    )
  } else if (videos.length === 0) {
    body =
      tab === 'following' ? (
        <FollowingEmptyState followsAnyone={followingCount > 0} />
      ) : (
        <CenteredState>
          <p className="font-semibold">No videos yet</p>
          <Link to="/upload" className="text-sm font-semibold text-tt-secondary">
            Upload the first one
          </Link>
        </CenteredState>
      )
  } else {
    body = (
      <>
        {videos.map((v, i) => (
          <VideoSlide key={v.id} video={v} index={i} active={i === activeIndex} />
        ))}
        {/* Trailing slide gets the next index so scrolling onto it pauses the last video. */}
        {hasNextPage || isFetchingNextPage ? (
          <CenteredState index={videos.length}>
            <LoaderCircle size={32} className="animate-spin text-white/70" />
          </CenteredState>
        ) : (
          <CenteredState index={videos.length}>
            <p className="text-lg font-bold">You&apos;re all caught up</p>
            <p className="text-sm text-tt-muted">
              {tab === 'following'
                ? "You've seen all new videos from accounts you follow."
                : "That's everything for now — check back for more."}
            </p>
            <div className="mt-2 flex gap-3">
              <button type="button" onClick={onReselect} className="rounded bg-white/10 px-4 py-2 text-sm font-semibold">
                Back to top
              </button>
              {tab === 'following' && (
                <Link to="/" replace className="rounded bg-tt-primary px-4 py-2 text-sm font-semibold">
                  For You
                </Link>
              )}
            </div>
          </CenteredState>
        )}
      </>
    )
  }

  return (
    <div className="relative h-[100dvh] bg-black text-white">
      <div ref={containerRef} className="snap-feed no-scrollbar" tabIndex={-1}>
        {body}
      </div>
      <FeedTabs tab={tab} onReselect={onReselect} />
      {videos.length > 0 && (
        <div className="absolute right-6 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
          <button
            type="button"
            aria-label="Previous video"
            disabled={activeIndex === 0}
            onClick={() => scrollToIndex(activeIndex - 1)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30"
          >
            <ChevronUp size={26} />
          </button>
          <button
            type="button"
            aria-label="Next video"
            disabled={activeIndex >= videos.length}
            onClick={() => scrollToIndex(activeIndex + 1)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30"
          >
            <ChevronDown size={26} />
          </button>
        </div>
      )}
      <BottomNav active="home" />
    </div>
  )
}
