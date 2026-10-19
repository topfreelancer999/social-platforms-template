import { StoryThumb } from './StoryThumb'
import type { StoryPreview } from './stories'

/** Story context shown above a Messenger message that was sent as a story reply. */
export function StoryReplyPreview({ story, mine, otherName }: { story: StoryPreview; mine: boolean; otherName: string }) {
  return (
    <div className={`mb-1 flex flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`}>
      <span className="text-xs text-fb-muted">{mine ? `You replied to ${otherName}'s story` : 'Replied to your story'}</span>
      {story.expired ? (
        <div className="flex h-28 w-16 items-center justify-center rounded-lg bg-[#e4e6eb] p-1 text-center text-[10px] text-fb-muted">Story unavailable</div>
      ) : (
        <StoryThumb story={story} className="h-28 w-16 rounded-lg" textClassName="text-[9px] leading-tight" />
      )}
    </div>
  )
}
