import { useRef, useState } from 'react'

/**
 * One shared <audio> element for previewing sounds. Spread `audioProps` onto an <audio> and call
 * `toggle(id, url)` from click handlers; starting a new sound stops the previous one.
 */
export function useAudioPreview() {
  const ref = useRef<HTMLAudioElement>(null)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [failedId, setFailedId] = useState<string | null>(null)

  const play = (el: HTMLAudioElement, id: string) =>
    el.play().catch((err: DOMException) => {
      // AbortError just means another sound was picked before this one started.
      if (err.name !== 'AbortError') setFailedId(id)
    })

  const toggle = (id: string, url: string) => {
    const el = ref.current
    if (!el || !url) return
    if (currentId === id) {
      if (el.paused) play(el, id)
      else el.pause()
      return
    }
    el.src = url
    setCurrentId(id)
    setFailedId(null)
    play(el, id)
  }

  const stop = () => ref.current?.pause()

  return {
    audioProps: {
      ref,
      preload: 'none' as const,
      onPlay: () => setPlaying(true),
      onPause: () => setPlaying(false),
      onEnded: () => setPlaying(false),
      onError: () => {
        setPlaying(false)
        setFailedId(currentId)
      },
    },
    playingId: playing ? currentId : null,
    failedId,
    toggle,
    stop,
  }
}
