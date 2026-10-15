import { cn } from '@/lib/cn'
export function Button({ className, variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  return (
    <button
      className={cn(
        'rounded-lg font-semibold px-4 py-2 text-sm disabled:opacity-50',
        variant === 'primary' && 'bg-fb-primary text-white hover:bg-fb-primary-hover',
        variant === 'secondary' && 'bg-[#e4e6eb] text-fb-text hover:bg-[#d8dadf]',
        variant === 'ghost' && 'hover:bg-[#f0f2f5]',
        className,
      )}
      {...props}
    />
  )
}
