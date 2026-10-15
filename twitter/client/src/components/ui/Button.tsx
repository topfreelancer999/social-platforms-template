import { cn } from '@/lib/cn'

export function Button({
  className,
  variant = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  return (
    <button
      className={cn(
        'rounded-lg font-semibold px-4 py-2 text-sm disabled:opacity-50',
        variant === 'primary' && 'bg-x-primary text-white hover:bg-x-primary-hover',
        variant === 'secondary' && 'border border-x-border-light dark:border-x-border text-x-text-light dark:text-x-text hover:bg-black/5 dark:hover:bg-white/10',
        variant === 'ghost' && 'hover:bg-black/5 dark:hover:bg-white/10',
        className,
      )}
      {...props}
    />
  )
}
