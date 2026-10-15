import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'

export interface ListingCardData {
  id: string
  title: string
  city: string
  country: string
  pricePerNight: number
  imageUrl?: string
  photos?: string[]
  averageRating?: number
  reviewCount?: number
  host?: { superhost?: boolean }
}

export function ListingCard({ listing }: { listing: ListingCardData }) {
  const img = listing.imageUrl ?? listing.photos?.[0] ?? 'https://picsum.photos/seed/placeholder/400/300'
  return (
    <Link to={`/listing/${listing.id}`} className="group block">
      <div className="relative aspect-square rounded-xl overflow-hidden mb-2">
        <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        <button type="button" className="absolute top-3 right-3 p-1" onClick={(e) => e.preventDefault()}>
          <Heart size={22} className="text-white drop-shadow" />
        </button>
      </div>
      <div className="text-[15px]">
        <p className="font-semibold truncate">{listing.city}, {listing.country}</p>
        <p className="text-ab-muted truncate">{listing.title}</p>
        <p className="text-ab-muted text-sm mt-0.5">
          {listing.averageRating ? `★ ${listing.averageRating}` : 'New'} · {listing.reviewCount ?? 0} reviews
        </p>
        <p className="mt-1">
          <span className="font-semibold">${listing.pricePerNight}</span> night
        </p>
      </div>
    </Link>
  )
}
