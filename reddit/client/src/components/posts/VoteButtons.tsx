import { ChevronUp, ChevronDown } from 'lucide-react'

export function VoteButtons({
  score,
  myVote,
  onVote,
  layout = 'vertical',
}: {
  score: number
  myVote: number
  onVote: (v: 1 | -1) => void
  layout?: 'vertical' | 'horizontal'
}) {
  const up = myVote === 1
  const down = myVote === -1
  if (layout === 'horizontal') {
    return (
      <div className="flex items-center gap-1 text-sm font-semibold text-rd-muted">
        <button type="button" onClick={() => onVote(1)} className={up ? 'text-rd-orange' : 'hover:text-rd-orange'}><ChevronUp size={20} /></button>
        <span className={score > 0 ? 'text-rd-orange' : score < 0 ? 'text-rd-blue' : ''}>{score}</span>
        <button type="button" onClick={() => onVote(-1)} className={down ? 'text-rd-blue' : 'hover:text-rd-blue'}><ChevronDown size={20} /></button>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center text-xs font-semibold text-rd-muted w-10 shrink-0">
      <button type="button" onClick={() => onVote(1)} className={`p-1 rounded hover:bg-rd-bg ${up ? 'text-rd-orange' : ''}`}>
        <ChevronUp size={22} />
      </button>
      <span className={`py-0.5 ${score > 0 ? 'text-rd-orange' : score < 0 ? 'text-rd-blue' : ''}`}>{score}</span>
      <button type="button" onClick={() => onVote(-1)} className={`p-1 rounded hover:bg-rd-bg ${down ? 'text-rd-blue' : ''}`}>
        <ChevronDown size={22} />
      </button>
    </div>
  )
}
