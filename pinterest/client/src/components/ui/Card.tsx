import { cn } from '@/lib/cn'
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('bg-fb-card rounded-lg shadow-sm border border-fb-border', className)}>{children}</div>
}
