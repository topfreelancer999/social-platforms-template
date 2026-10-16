import { useState } from 'react'
import { Captions, Check, ChevronLeft, ChevronRight, Gauge } from 'lucide-react'
import type { CaptionTrack } from './types'
import { PLAYBACK_SPEEDS, speedLabel } from './speeds'

type Panel = 'main' | 'captions' | 'speed'

/** Gear menu: main list → "Subtitles/CC" or "Playback speed" sub-panels, like YouTube's. */
export function SettingsMenu({ captions, activeLanguage, speed, onCaptions, onSpeed }: {
  captions: CaptionTrack[]
  activeLanguage: string
  speed: number
  onCaptions: (language: string) => void
  onSpeed: (speed: number) => void
}) {
  const [panel, setPanel] = useState<Panel>('main')
  const active = captions.find((c) => c.language === activeLanguage)

  const option = (label: string, selected: boolean, onClick: () => void) => (
    <button
      key={label}
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-white/10 text-left"
    >
      <span className="w-5">{selected && <Check size={18} />}</span>
      {label}
    </button>
  )

  const header = (title: string) => (
    <button
      type="button"
      onClick={() => setPanel('main')}
      className="w-full flex items-center gap-2 px-3 py-3 text-sm font-medium border-b border-white/15 hover:bg-white/10"
    >
      <ChevronLeft size={18} /> {title}
    </button>
  )

  return (
    <div
      role="menu"
      className="absolute bottom-14 right-3 z-20 w-64 max-h-[min(320px,calc(100%-4.5rem))] overflow-y-auto rounded-xl bg-[rgba(28,28,28,0.92)] backdrop-blur py-2 text-white shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      {panel === 'main' && (
        <>
          <button
            type="button"
            onClick={() => setPanel('captions')}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/10"
          >
            <Captions size={20} />
            <span className="flex-1 text-left">Subtitles/CC</span>
            <span className="text-white/70 truncate max-w-[90px]">
              {captions.length ? (active?.label ?? 'Off') : 'Unavailable'}
            </span>
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => setPanel('speed')}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/10"
          >
            <Gauge size={20} />
            <span className="flex-1 text-left">Playback speed</span>
            <span className="text-white/70">{speedLabel(speed)}</span>
            <ChevronRight size={16} />
          </button>
        </>
      )}
      {panel === 'captions' && (
        <>
          {header('Subtitles/CC')}
          {captions.length === 0 && <p className="px-4 py-3 text-sm text-white/70">No subtitles for this video</p>}
          {captions.length > 0 && option('Off', !active, () => onCaptions(''))}
          {captions.map((c) => option(c.label, c.language === active?.language, () => onCaptions(c.language)))}
        </>
      )}
      {panel === 'speed' && (
        <>
          {header('Playback speed')}
          {PLAYBACK_SPEEDS.map((s) => option(speedLabel(s), s === speed, () => onSpeed(s)))}
        </>
      )}
    </div>
  )
}
