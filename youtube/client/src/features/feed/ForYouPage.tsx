import { Link } from 'react-router-dom'
import { useState, useRef, useCallback } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { VideoSlide, type VideoItem } from './VideoSlide'
import { BottomNav } from '@/components/layout/BottomNav'

export function ForYouPage() {
  const token = useAuthStore((s) => s.accessToken)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['feed', 'for-you'],
    queryFn: ({ pageParam = 1 }) =>
      api<{ items: VideoItem[]; hasMore: boolean }>(`/feed/for-you?page=${pageParam}`, {
        headers: authHeaders(token),
      }),
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length + 1 : undefined),
    initialPageParam: 1,
  })
  const videos = data?.pages.flatMap((p) => p.items) ?? []

  const onScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const idx = Math.round(el.scrollTop / el.clientHeight)
    if (idx !== activeIndex) setActiveIndex(idx)
    if (hasNextPage && !isFetchingNextPage && idx >= videos.length - 2) fetchNextPage()
  }, [activeIndex, videos.length, hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <div className="relative h-[100dvh] bg-black">
      <div ref={containerRef} className="snap-feed" onScroll={onScroll}>
        {videos.map((v, i) => (
          <VideoSlide key={v.id} video={v} active={i === activeIndex} />
        ))}
        {videos.length === 0 && (
          <div className="h-[100dvh] flex items-center justify-center text-tt-muted">No videos yet</div>
        )}
      </div>
      <div className="absolute top-0 left-0 right-0 z-20 flex justify-center gap-6 pt-3 text-sm font-semibold pointer-events-none">
        <span className="text-white border-b-2 border-white pb-1">For You</span>
        <Link to="/following" className="text-tt-muted pb-1">Following</Link>
      </div>
      <BottomNav active="home" />
    </div>
  )
}
