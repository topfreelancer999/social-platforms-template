import { cn } from '@/lib/cn'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export function Textarea({ label, className, id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-linkedin-muted">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          'w-full rounded px-3 py-2 text-sm border border-linkedin-border focus:border-linkedin-primary focus:outline-none resize-none',
          className,
        )}
        {...props}
      />
    </div>
  )
}
