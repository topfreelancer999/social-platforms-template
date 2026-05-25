export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`inline-block h-8 w-8 animate-spin rounded-full border-4 border-linkedin-primary border-t-transparent ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}
