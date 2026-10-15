import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Link } from 'react-router-dom'

export function HashtagPage() {
  const { tag } = useParams()
  const { data } = useQuery({
    queryKey: ['hashtag', tag],
    queryFn: () => api<{ tag: string; tweets: { id: string; content: string }[] }>(`/trending/hashtag/${tag}`),
  })
  return (
    <div>
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur border-b border-x-border-light dark:border-x-border px-4 py-3">
        <h1 className="text-xl font-bold">#{tag}</h1>
      </header>
      {data?.tweets?.map((t) => (
        <Link key={t.id} to={`/tweet/${t.id}`} className="block p-4 border-b border-x-border-light dark:border-x-border hover:bg-black/5 dark:hover:bg-white/5 text-sm">
          {t.content}
        </Link>
      ))}
    </div>
  )
}
