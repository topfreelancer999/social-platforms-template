import { cn } from '@/lib/cn'

type PinImageSource = {
  title: string
  imageUrl: string
  imageWidth?: number | null
  imageHeight?: number | null
  dominantColor?: string | null
}

/** Grids crop very tall pins at 1:2.5, like Pinterest does. */
const MIN_GRID_RATIO = 1 / 2.5

/**
 * Reserves the image's aspect ratio (from the stored width/height) before it loads, so grids
 * don't shift, and shows the pin's dominant color as the placeholder.
 */
export function PinImage({
  pin,
  cropTall = false,
  className,
  loading = 'lazy',
}: {
  pin: PinImageSource
  cropTall?: boolean
  className?: string
  loading?: 'lazy' | 'eager'
}) {
  const { imageWidth: w, imageHeight: h } = pin
  if (!w || !h) {
    return <img src={pin.imageUrl} alt={pin.title} className={cn('block w-full', className)} loading={loading} />
  }
  const ratio = cropTall ? Math.max(w / h, MIN_GRID_RATIO) : w / h
  return (
    <div
      className={cn('w-full overflow-hidden', className)}
      style={{ aspectRatio: ratio, backgroundColor: pin.dominantColor ?? undefined }}
    >
      <img
        src={pin.imageUrl}
        alt={pin.title}
        width={w}
        height={h}
        className="block h-full w-full object-cover"
        loading={loading}
      />
    </div>
  )
}
