import { cn } from '@/lib/cn'

export function Card({
  children,
  className,
  padding = true,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  padding?: boolean
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      className={cn(
        'bg-linkedin-card rounded-lg border border-linkedin-border overflow-hidden',
        padding && 'p-4',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  )
}
