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
        variant === 'primary' && 'bg-ab-primary text-white hover:bg-ab-primary-hover',
        variant === 'secondary' && 'border border-ab-border text-ab-text hover:bg-gray-50',
        variant === 'ghost' && 'hover:bg-gray-100',
        className,
      )}
      {...props}
    />
  )
}
