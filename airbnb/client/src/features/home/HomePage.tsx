import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { CATEGORIES } from '@/lib/constants'
import { ListingCard, type ListingCardData } from '@/components/listings/ListingCard'

export function HomePage() {
  const navigate = useNavigate()
  const [where, setWhere] = useState('')
  const [guests, setGuests] = useState('2')
  const { data: featured } = useQuery({
    queryKey: ['listings-featured'],
    queryFn: () => api<ListingCardData[]>('/listings/featured'),
  })
  const search = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (where) params.set('city', where)
    if (guests) params.set('guests', guests)
    navigate(`/search?${params}`)
  }
  return (
    <div>
      <section className="bg-gradient-to-br from-[#ff385c]/10 to-transparent px-4 py-10 md:py-16">
        <h1 className="text-3xl md:text-5xl font-semibold max-w-xl">Find your next stay</h1>
        <p className="text-ab-muted mt-2 max-w-lg">Discover homes, experiences, and travel communities.</p>
        <form onSubmit={search} className="mt-6 flex flex-col md:flex-row bg-white border border-ab-border rounded-full shadow-lg overflow-hidden max-w-3xl">
          <div className="flex-1 flex items-center gap-2 px-4 py-3 border-b md:border-b-0 md:border-r border-ab-border">
            <Search size={18} className="text-ab-muted shrink-0" />
            <input
              value={where}
              onChange={(e) => setWhere(e.target.value)}
              placeholder="Where to?"
              className="w-full outline-none text-sm"
            />
          </div>
          <div className="px-4 py-3 border-b md:border-b-0 md:border-r border-ab-border md:w-28">
            <input type="number" min={1} value={guests} onChange={(e) => setGuests(e.target.value)} className="w-full outline-none text-sm" placeholder="Guests" />
          </div>
          <button type="submit" className="bg-ab-primary hover:bg-ab-primary-hover text-white font-semibold px-8 py-3 m-2 md:m-1 rounded-full text-sm">
            Search
          </button>
        </form>
      </section>
      <section className="px-4 py-6 flex gap-4 overflow-x-auto">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => navigate(`/search?type=${c.id}`)}
            className="shrink-0 px-4 py-2 rounded-full border border-ab-border text-sm font-medium hover:border-ab-text"
          >
            {c.label}
          </button>
        ))}
      </section>
      <section className="px-4 pb-12">
        <h2 className="text-2xl font-semibold mb-4">Explore nearby</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {featured?.map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
      </section>
    </div>
  )
}
