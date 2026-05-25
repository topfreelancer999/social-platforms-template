import { cn } from '@/lib/cn'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-linkedin-muted">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full rounded px-3 py-2 text-sm border border-linkedin-border focus:border-linkedin-primary focus:outline-none focus:ring-1 focus:ring-linkedin-primary',
          error && 'border-red-500',
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
