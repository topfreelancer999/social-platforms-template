import { Link } from 'react-router-dom'
import { PinImage } from './PinImage'

export type PinItem = {
  id: string
  title: string
  description?: string
  imageUrl: string
  imageWidth?: number | null
  imageHeight?: number | null
  dominantColor?: string | null
  author: { id?: string; username: string; avatarUrl?: string }
  saveCount?: number
  savedByMe?: boolean
}

export function PinCard({ pin, onSave }: { pin: PinItem; onSave?: (pinId: string) => void }) {
  return (
    <article className="masonry-item group relative overflow-hidden rounded-2xl bg-[#efefef]">
      <Link to={`/pin/${pin.id}`}>
        <PinImage pin={pin} cropTall />
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 via-transparent to-transparent p-3 opacity-0 transition group-hover:opacity-100">
          <h3 className="text-sm font-semibold text-white line-clamp-2">{pin.title}</h3>
          <p className="text-xs text-white/80">@{pin.author.username}</p>
        </div>
      </Link>
      {onSave && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            onSave(pin.id)
          }}
          className={`absolute right-2 top-2 rounded-full px-3 py-1.5 text-sm font-bold shadow ${
            pin.savedByMe ? 'bg-[#111] text-white' : 'bg-[var(--pin-red)] text-white hover:bg-[var(--pin-red-hover)]'
          }`}
        >
          {pin.savedByMe ? 'Saved' : 'Save'}
        </button>
      )}
    </article>
  )
}
