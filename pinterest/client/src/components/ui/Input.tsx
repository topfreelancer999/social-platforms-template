export function Input({ label, className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block w-full">
      {label && <span className="text-sm font-medium text-fb-muted mb-1 block">{label}</span>}
      <input className={`w-full border border-fb-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-fb-primary ${className}`} {...props} />
    </label>
  )
}
