import { cn } from '@/lib/cn'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold transition-colors disabled:opacity-50',
        variant === 'primary' &&
          'bg-linkedin-primary text-white hover:bg-linkedin-primary-hover',
        variant === 'secondary' &&
          'border border-linkedin-primary text-linkedin-primary hover:bg-blue-50',
        variant === 'outline' &&
          'border border-linkedin-border text-linkedin-muted hover:bg-gray-100',
        variant === 'ghost' && 'text-linkedin-muted hover:bg-gray-100',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
        size === 'sm' && 'px-4 py-1 text-sm',
        size === 'md' && 'px-6 py-2 text-sm',
        size === 'lg' && 'px-8 py-3',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
