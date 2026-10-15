import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { VideoSlide, type VideoItem } from './VideoSlide'
import { BottomNav } from '@/components/layout/BottomNav'

export function FollowingPage() {
  const token = useAuthStore((s) => s.accessToken)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const { data } = useInfiniteQuery({
    queryKey: ['feed', 'following'],
    queryFn: ({ pageParam = 1 }) =>
      api<{ items: VideoItem[] }>(`/feed/following?page=${pageParam}`, { headers: authHeaders(token) }),
    getNextPageParam: (_, pages) => pages.length + 1,
    initialPageParam: 1,
  })
  const videos = data?.pages.flatMap((p) => p.items) ?? []

  const onScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    setActiveIndex(Math.round(el.scrollTop / el.clientHeight))
  }, [])

  return (
    <div className="relative h-[100dvh] bg-black">
      <div ref={containerRef} className="snap-feed" onScroll={onScroll}>
        {videos.map((v, i) => (
          <VideoSlide key={v.id} video={v} active={i === activeIndex} />
        ))}
        {videos.length === 0 && (
          <div className="h-[100dvh] flex flex-col items-center justify-center text-tt-muted px-8 text-center">
            <p>Follow creators to see their videos here</p>
            <Link to="/discover" className="text-tt-secondary mt-4 font-semibold">Discover</Link>
          </div>
        )}
      </div>
      <div className="absolute top-0 left-0 right-0 z-20 flex justify-center gap-6 pt-3 text-sm font-semibold">
        <Link to="/" className="text-tt-muted pb-1">For You</Link>
        <span className="text-white border-b-2 border-white pb-1">Following</span>
      </div>
      <BottomNav active="home" />
    </div>
  )
}
