import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Plus } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { StoryThumb } from './StoryThumb'
import { trayQuery, type StoryGroup } from './stories'

const CARD = 'relative shrink-0 w-[104px] sm:w-[112px] h-[184px] sm:h-[200px] rounded-xl overflow-hidden'

function AuthorCard({ group }: { group: StoryGroup }) {
  // Like Facebook, the card previews the first story you haven't watched yet.
  const cover = group.stories.find((s) => !s.seen) ?? group.stories[group.stories.length - 1]
  const name = group.isSelf ? 'Your story' : `${group.author.firstName} ${group.author.lastName}`
  return (
    <Link
      to={`/stories/${group.author.id}`}
      state={{ from: '/' }}
      aria-label={`${name}${group.hasUnseen ? ', new' : ''}`}
      className={cn(CARD, 'group bg-[#e4e6eb]')}
    >
      <StoryThumb story={cover} className="absolute inset-0 h-full w-full transition-transform duration-200 group-hover:scale-105" textClassName="text-xs" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
      <span
        className={cn(
          'absolute top-2.5 left-2.5 rounded-full p-[3px]',
          group.hasUnseen || group.isSelf ? 'bg-fb-primary' : 'bg-[#bcc0c4]',
        )}
      >
        <img src={group.author.avatarUrl} alt="" className="h-8 w-8 rounded-full border-2 border-white object-cover" />
      </span>
      <span className="absolute bottom-2 left-2 right-2 text-white text-[13px] font-semibold leading-tight line-clamp-2 drop-shadow">{name}</span>
    </Link>
  )
}

export function StoriesTray() {
  const { user, accessToken } = useAuthStore()
  const scroller = useRef<HTMLDivElement>(null)
  const { data, isLoading, isError, refetch } = useQuery(trayQuery(accessToken))
  const groups = (data ?? []).filter((g) => g.stories.length > 0)
  const friends = groups.filter((g) => !g.isSelf)
  return (
    <Card className="p-3 mb-4 relative">
      <div ref={scroller} className="flex gap-2 overflow-x-auto [scrollbar-width:none]" data-testid="stories-tray">
        <Link to="/stories/create" className={cn(CARD, 'bg-fb-card border border-fb-border group shadow-sm')}>
          <div className="h-[70%] overflow-hidden bg-[#e4e6eb]">
            {user?.avatarUrl && <img src={user.avatarUrl} alt="" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" />}
          </div>
          <span className="absolute left-1/2 top-[70%] -translate-x-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-fb-primary text-white border-4 border-fb-card">
            <Plus size={18} strokeWidth={3} />
          </span>
          <span className="absolute bottom-2.5 left-0 right-0 text-center text-[13px] font-semibold">Create story</span>
        </Link>
        {isLoading && [0, 1, 2, 3].map((i) => <div key={i} className={cn(CARD, 'bg-[#e4e6eb] animate-pulse')} />)}
        {groups.map((g) => <AuthorCard key={g.author.id} group={g} />)}
        {!isLoading && !isError && friends.length === 0 && (
          <div className="flex items-center px-3 text-sm text-fb-muted min-w-[160px]">
            No stories from friends right now. Share one of your own!
          </div>
        )}
        {isError && (
          <div className="flex flex-col justify-center gap-1 px-3 text-sm text-fb-muted min-w-[160px]">
            Couldn&apos;t load stories.
            <button onClick={() => refetch()} className="text-fb-primary font-semibold text-left">Try again</button>
          </div>
        )}
      </div>
      {groups.length > 3 && (
        <button
          onClick={() => scroller.current?.scrollBy({ left: 360, behavior: 'smooth' })}
          aria-label="More stories"
          className="hidden sm:flex absolute right-5 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-fb-card shadow-md border border-fb-border text-fb-muted hover:bg-[#f0f2f5]"
        >
          <ChevronRight size={22} />
        </button>
      )}
    </Card>
  )
}
