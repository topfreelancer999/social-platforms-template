import { cn } from '@/lib/cn'

/** WeChat-style group avatar: a grid of up to 9 member avatars. */
export function GroupAvatar({ avatars, className }: { avatars: string[]; className?: string }) {
  const shown = avatars.slice(0, 9)
  const cols = shown.length <= 1 ? 1 : shown.length <= 4 ? 2 : 3
  return (
    <div
      className={cn('grid gap-px p-px bg-[#dcdcdc] rounded-md overflow-hidden shrink-0 content-center', className)}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {shown.map((src, i) => (
        <img key={i} src={src} alt="" className="w-full aspect-square object-cover" />
      ))}
    </div>
  )
}
