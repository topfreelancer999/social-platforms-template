import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { TweetCard } from './TweetCard'
import { useQuotes } from './hooks'

/** "Quotes" list for a post: every quote post that embeds it. */
export function QuotesPage() {
  const { id } = useParams()
  const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } = useQuotes(id)
  const quotes = data?.pages.flatMap((p) => p.items) ?? []
  const total = data?.pages[0]?.total
  return (
    <div>
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur border-b border-x-border-light dark:border-x-border px-4 py-2 flex items-center gap-6">
        <Link to={`/tweet/${id}`} className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10" aria-label="Back to post">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold leading-tight">Quotes</h1>
          {total !== undefined && <p className="text-xs text-x-muted">{total} {total === 1 ? 'quote' : 'quotes'}</p>}
        </div>
      </header>
      {isLoading && <p className="p-4 text-x-muted text-sm">Loading…</p>}
      {isError && <p className="p-4 text-x-muted text-sm">This post is unavailable.</p>}
      {!isLoading && !isError && quotes.length === 0 && (
        <div className="p-8 text-center">
          <p className="text-2xl font-extrabold">No Quotes yet</p>
          <p className="text-x-muted text-sm mt-1">When someone quotes this post, it'll show up here.</p>
        </div>
      )}
      {quotes.map((q) => (
        <TweetCard key={q.id} tweet={q} />
      ))}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} className="w-full py-4 text-x-primary font-semibold text-sm">
          {isFetchingNextPage ? 'Loading…' : 'Show more'}
        </button>
      )}
    </div>
  )
}
