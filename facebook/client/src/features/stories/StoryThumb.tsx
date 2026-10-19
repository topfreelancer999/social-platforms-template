import { cn } from '@/lib/cn'
import { backgroundCss, type StoryType } from './stories'

/** Static preview of a story (photo or text on its gradient), used in the tray, Messenger and composer. */
export function StoryThumb({ story, className, textClassName }: {
  story: { type: StoryType; mediaUrl: string | null; text: string | null; background: string | null }
  className?: string
  textClassName?: string
}) {
  if (story.type === 'PHOTO' && story.mediaUrl) {
    return <img src={story.mediaUrl} alt="" className={cn('object-cover bg-[#e4e6eb]', className)} />
  }
  return (
    <div className={cn('flex items-center justify-center p-2 text-center', className)} style={{ background: backgroundCss(story.background) }}>
      <span className={cn('text-white font-semibold break-words line-clamp-4', textClassName)}>{story.text}</span>
    </div>
  )
}
