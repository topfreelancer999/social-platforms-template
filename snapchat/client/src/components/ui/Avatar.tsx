import { cn } from '@/lib/cn'
export function Avatar({ src, name, alt, size = 'md', className }: { src?: string; name?: string; alt?: string; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const label = name ?? alt
  const s = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-14 w-14', xl: 'h-16 w-16' }[size]
  return (
    <div className={cn('rounded-full overflow-hidden bg-[#e4e6eb] shrink-0', s, className)}>
      {src ? <img src={src} alt={label ?? ''} className="h-full w-full object-cover" /> : (
        <span className="flex h-full w-full items-center justify-center text-xs font-bold text-white/50">
          {label?.[0]}
        </span>
      )}
    </div>
  )
}
