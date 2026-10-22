import { useDeferredValue, useEffect, useState } from 'react'
import { Bookmark, Check, LoaderCircle, Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { SoundRow } from './SoundRow'
import type { Sound } from './types'
import { useAudioPreview } from './useAudioPreview'
import { useFavoriteSounds, useSoundSearch, useToggleSoundFavorite } from './useSounds'

type PickerTab = 'discover' | 'favorites'

/** Bottom sheet (dialog on desktop) for choosing the sound of a new upload. */
export function SoundPicker({
  selectedId,
  onSelect,
  onClose,
}: {
  selectedId: string | null
  onSelect: (sound: Sound) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<PickerTab>('discover')
  const [q, setQ] = useState('')
  const query = useDeferredValue(q.trim())
  const search = useSoundSearch(query, 30)
  const favorites = useFavoriteSounds(tab === 'favorites')
  const toggleFavorite = useToggleSoundFavorite()
  const preview = useAudioPreview()
  const list = tab === 'discover' ? search : favorites
  const sounds = list.data ?? []

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const tabButton = (key: PickerTab, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === key}
      onClick={() => setTab(key)}
      className={cn(
        'relative flex-1 py-2.5 text-sm font-semibold',
        tab === key ? 'text-white' : 'text-white/50 hover:text-white/80',
      )}
    >
      {label}
      {tab === key && <span className="absolute bottom-0 left-1/2 h-0.5 w-10 -translate-x-1/2 bg-white" />}
    </button>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add sound"
        className="flex h-[85dvh] w-full flex-col rounded-t-2xl bg-[#161616] text-white sm:h-[620px] sm:max-w-md sm:rounded-2xl"
      >
        <audio {...preview.audioProps} />
        <div className="flex items-center justify-between px-4 pt-3">
          <span className="w-8" />
          <h2 className="text-base font-bold">Sounds</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10">
            <X size={20} />
          </button>
        </div>
        <label className="mx-4 mt-3 flex items-center gap-2 rounded-md bg-white/10 px-3 py-2">
          <Search size={16} className="text-white/60" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setTab('discover')
            }}
            placeholder="Search sounds"
            aria-label="Search sounds"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/40"
          />
          {search.isFetching && tab === 'discover' && <LoaderCircle size={14} className="animate-spin text-white/50" />}
        </label>
        <div role="tablist" className="mt-2 flex border-b border-white/10">
          {tabButton('discover', 'Discover')}
          {tabButton('favorites', 'Favorites')}
        </div>
        <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-4">
          {list.isPending ? (
            <div className="space-y-3 pt-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-14 w-14 animate-pulse rounded-md bg-white/10" />
                  <div className="h-4 flex-1 animate-pulse rounded bg-white/10" />
                </div>
              ))}
            </div>
          ) : list.isError ? (
            <div className="py-10 text-center text-sm">
              <p className="font-semibold">Couldn&apos;t load sounds</p>
              <button type="button" onClick={() => list.refetch()} className="mt-2 text-tt-secondary">
                Retry
              </button>
            </div>
          ) : sounds.length === 0 ? (
            <p className="py-10 text-center text-sm text-tt-muted">
              {tab === 'favorites' ? 'Sounds you add to Favorites show up here.' : `No sounds match "${query}"`}
            </p>
          ) : (
            sounds.map((s) => {
              const selected = s.id === selectedId
              return (
                <SoundRow
                  key={s.id}
                  sound={s}
                  playing={preview.playingId === s.id}
                  failed={preview.failedId === s.id}
                  onTogglePreview={() => preview.toggle(s.id, s.audioUrl)}
                  onNavigate={onClose}
                >
                  <button
                    type="button"
                    onClick={() => toggleFavorite.mutate(s)}
                    aria-label={s.favorited ? 'Remove from Favorites' : 'Add to Favorites'}
                    className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10"
                  >
                    <Bookmark size={18} fill={s.favorited ? '#facc15' : 'none'} className={s.favorited ? 'text-yellow-400' : 'text-white/70'} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      preview.stop()
                      onSelect(s)
                    }}
                    aria-pressed={selected}
                    className={cn(
                      'flex h-8 min-w-14 items-center justify-center rounded px-3 text-xs font-semibold',
                      selected ? 'bg-white/15' : 'bg-tt-primary',
                    )}
                  >
                    {selected ? <Check size={16} /> : 'Use'}
                  </button>
                </SoundRow>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
