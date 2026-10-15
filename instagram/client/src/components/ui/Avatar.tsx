import { cn } from '@/lib/cn'
export function Avatar({ src, name, size = 'md', className }: { src?: string; name?: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const s = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-12 w-12' }[size]
  return (
    <div className={cn('rounded-full overflow-hidden bg-[#e4e6eb] shrink-0', s, className)}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : (
        <span className="flex h-full w-full items-center justify-center text-xs font-bold text-fb-muted">
          {name?.[0]}
        </span>
      )}
    </div>
  )
}
