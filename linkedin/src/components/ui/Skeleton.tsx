import { cn } from '@/lib/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-gray-200 rounded', className)} />
}
