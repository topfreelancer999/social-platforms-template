import { cn } from '@/lib/cn'

interface AvatarProps {
  src?: string
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = { sm: 'h-8 w-8', md: 'h-12 w-12', lg: 'h-16 w-16', xl: 'h-24 w-24' }

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const initials = name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <div
      className={cn(
        'rounded-full overflow-hidden bg-gray-300 flex items-center justify-center shrink-0',
        sizes[size],
        className,
      )}
    >
      {src ? (
        <img src={src} alt={name ?? ''} className="h-full w-full object-cover" />
      ) : (
        <span className="text-xs font-semibold text-gray-600">{initials}</span>
      )}
    </div>
  )
}
