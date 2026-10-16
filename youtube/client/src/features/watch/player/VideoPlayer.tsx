import { useEffect, useEffectEvent, useRef, useState } from 'react'
import {
  Captions,
  Maximize,
  Minimize,
  Pause,
  Play,
  RectangleHorizontal,
  RotateCcw,
  Settings,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { formatDuration } from '@/lib/format'
import { ProgressBar } from './ProgressBar'
import { SettingsMenu } from './SettingsMenu'
import { PLAYBACK_SPEEDS, speedLabel } from './speeds'
import type { CaptionTrack } from './types'

/** Save the playback position at most this often while playing (plus on pause / leave). */
const SAVE_EVERY_MS = 10_000
const HIDE_CONTROLS_MS = 2500

type Props = {
  videoId: string
  src: string
  poster: string
  captions: CaptionTrack[]
  /** Server-computed resume point (0 = start from the beginning). */
  startAt: number
  speed: number
  /** Preferred captions language, "" = off. */
  captionsLanguage: string
  theater: boolean
  onSpeedChange: (speed: number) => void
  onCaptionsChange: (language: string) => void
  onTheaterChange: (theater: boolean) => void
  onSaveProgress: (position: number, duration: number, opts?: { leaving?: boolean }) => void
}

const isTypingTarget = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

export function VideoPlayer(props: Props) {
  const { videoId, src, poster, captions, startAt, speed, captionsLanguage, theater } = props
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const resumed = useRef(false)
  const lastSave = useRef(0)
  const lastLanguage = useRef('')
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const touch = useRef(false)

  const [playing, setPlaying] = useState(false)
  const [started, setStarted] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [pointerActive, setPointerActive] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [resumeToast, setResumeToast] = useState<number | null>(null)
  const [cues, setCues] = useState<{ language: string; lines: string[] }>({ language: '', lines: [] })

  // Preferred language if this video has it, otherwise the first track when captions are on.
  const activeTrack = captions.find((c) => c.language === captionsLanguage) ?? (captionsLanguage ? captions[0] : undefined)
  const activeLanguage = activeTrack?.language ?? ''
  const controlsVisible = !playing || pointerActive || menuOpen

  const showFlash = (label: string) => {
    setFlash(label)
    clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(null), 700)
  }

  const poke = () => {
    setPointerActive(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setPointerActive(false), HIDE_CONTROLS_MS)
  }

  const save = (leaving = false, v = videoRef.current) => {
    if (!v || !v.duration || !Number.isFinite(v.duration)) return
    lastSave.current = Date.now()
    props.onSaveProgress(v.ended ? v.duration : v.currentTime, v.duration, { leaving })
  }

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused || v.ended) void v.play().catch(() => {})
    else v.pause()
  }

  const seekTo = (t: number) => {
    const v = videoRef.current
    if (!v || !duration) return
    v.currentTime = Math.min(Math.max(t, 0), duration)
    setCurrent(v.currentTime)
  }

  const seekBy = (delta: number) => {
    seekTo((videoRef.current?.currentTime ?? 0) + delta)
    showFlash(`${delta > 0 ? '+' : '−'}${Math.abs(delta)}s`)
  }

  const setVol = (next: number) => {
    const v = videoRef.current
    if (!v) return
    v.volume = Math.min(1, Math.max(0, next))
    v.muted = v.volume === 0
  }

  const toggleMute = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    if (!v.muted && v.volume === 0) v.volume = 0.5
    showFlash(v.muted ? 'Muted' : `Volume ${Math.round(v.volume * 100)}%`)
  }

  const chooseCaptions = (language: string) => {
    if (language) lastLanguage.current = language
    props.onCaptionsChange(language)
  }

  const toggleCaptions = () => {
    if (!captions.length) return
    if (activeLanguage) {
      lastLanguage.current = activeLanguage
      chooseCaptions('')
      showFlash('Subtitles off')
    } else {
      const lang = captions.some((c) => c.language === lastLanguage.current) ? lastLanguage.current : captions[0].language
      chooseCaptions(lang)
      showFlash(`${captions.find((c) => c.language === lang)?.label ?? 'Subtitles'} on`)
    }
  }

  const changeSpeed = (next: number) => {
    props.onSpeedChange(next)
    showFlash(`${speedLabel(next)}${next === 1 ? '' : 'x'}`)
  }

  const stepSpeed = (dir: 1 | -1) => {
    const i = PLAYBACK_SPEEDS.indexOf(speed)
    const next = PLAYBACK_SPEEDS[Math.min(PLAYBACK_SPEEDS.length - 1, Math.max(0, (i < 0 ? 3 : i) + dir))]
    if (next !== speed) changeSpeed(next)
  }

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void containerRef.current?.requestFullscreen?.()
  }

  // Keep the element's rate in sync with the (account-wide) preference.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.defaultPlaybackRate = speed
    v.playbackRate = speed
  }, [speed])

  // Captions: load the chosen <track> in "hidden" mode and draw its cues ourselves (YouTube look, above the controls).
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    let active: TextTrack | null = null
    for (const t of Array.from(v.textTracks)) {
      if (t.language === activeLanguage && !active) {
        t.mode = 'hidden'
        active = t
      } else {
        t.mode = 'disabled'
      }
    }
    if (!active) return
    const track = active
    const onCueChange = () => {
      const lines = Array.from(track.activeCues ?? [])
        // At an exact boundary both the ending and the starting cue are "active"; keep the new one.
        .filter((c) => c.endTime > v.currentTime)
        .map((c) => (c as VTTCue).text.replace(/<[^>]+>/g, ''))
        .flatMap((t) => t.split('\n'))
        .filter(Boolean)
      setCues({ language: track.language, lines })
    }
    track.addEventListener('cuechange', onCueChange)
    return () => track.removeEventListener('cuechange', onCueChange)
  }, [activeLanguage, captions])

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement && document.fullscreenElement === containerRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // Remember where we were when the viewer navigates away or closes the tab.
  const saveOnLeave = useEffectEvent((v: HTMLVideoElement | null) => save(true, v))
  useEffect(() => {
    // Captured now: React clears the ref before this cleanup runs on unmount.
    const v = videoRef.current
    const onHide = () => saveOnLeave(v)
    window.addEventListener('pagehide', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      saveOnLeave(v)
    }
  }, [])

  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return
    const focusedInPlayer = containerRef.current?.contains(document.activeElement) ?? false
    const handled = (() => {
      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          togglePlay()
          return true
        case 'j':
        case 'J':
          seekBy(-10)
          return true
        case 'l':
        case 'L':
          seekBy(10)
          return true
        case 'ArrowLeft':
          seekBy(-5)
          return true
        case 'ArrowRight':
          seekBy(5)
          return true
        case 'ArrowUp':
        case 'ArrowDown':
          if (!focusedInPlayer) return false
          setVol((videoRef.current?.volume ?? 1) + (e.key === 'ArrowUp' ? 0.05 : -0.05))
          showFlash(`Volume ${Math.round((videoRef.current?.volume ?? 0) * 100)}%`)
          return true
        case 'm':
        case 'M':
          toggleMute()
          return true
        case 'c':
        case 'C':
          toggleCaptions()
          return true
        case 'f':
        case 'F':
          toggleFullscreen()
          return true
        case 't':
        case 'T':
          if (!document.fullscreenElement) props.onTheaterChange(!theater)
          return true
        case '>':
          stepSpeed(1)
          return true
        case '<':
          stepSpeed(-1)
          return true
        default:
          if (/^[0-9]$/.test(e.key)) {
            seekTo((Number(e.key) / 10) * duration)
            return true
          }
          return false
      }
    })()
    if (handled) {
      e.preventDefault()
      poke()
    }
  })
  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKeyDown(e)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2
  const captionLines = cues.language === activeLanguage ? cues.lines : []
  const ctrl = 'p-2 rounded-full hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent'

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      aria-label="Video player"
      className={`relative w-full h-full bg-black select-none outline-none overflow-hidden ${controlsVisible ? '' : 'cursor-none'}`}
      onPointerMove={poke}
      onPointerDown={(e) => {
        touch.current = e.pointerType === 'touch'
      }}
      onPointerLeave={() => playing && setPointerActive(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        preload="metadata"
        className="w-full h-full object-contain"
        onClick={() => {
          if (menuOpen) return setMenuOpen(false)
          // First tap on touch screens only reveals the controls.
          if (touch.current && !controlsVisible) return poke()
          togglePlay()
        }}
        onDoubleClick={toggleFullscreen}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget
          setDuration(v.duration)
          v.playbackRate = speed
          if (!resumed.current) {
            resumed.current = true
            if (startAt > 0 && startAt < v.duration - 1) {
              v.currentTime = startAt
              setCurrent(startAt)
              setResumeToast(startAt)
              toastTimer.current = setTimeout(() => setResumeToast(null), 6000)
            }
          }
          void v.play().catch(() => setPlaying(false))
        }}
        onPlay={() => {
          setPlaying(true)
          setStarted(true)
          poke()
        }}
        onPause={() => {
          setPlaying(false)
          save()
        }}
        onEnded={() => {
          setPlaying(false)
          save()
        }}
        onTimeUpdate={(e) => {
          setCurrent(e.currentTarget.currentTime)
          if (!e.currentTarget.paused && Date.now() - lastSave.current > SAVE_EVERY_MS) save()
        }}
        onProgress={(e) => {
          const b = e.currentTarget.buffered
          if (b.length) setBuffered(b.end(b.length - 1))
        }}
        onVolumeChange={(e) => {
          setVolume(e.currentTarget.volume)
          setMuted(e.currentTarget.muted)
        }}
      >
        {captions.map((c) => (
          <track
            key={c.id}
            kind="subtitles"
            src={`/api/videos/${videoId}/captions/${c.id}`}
            srcLang={c.language}
            label={c.label}
          />
        ))}
      </video>

      {/* Big play button before the first play (autoplay blocked or disabled). */}
      {!started && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Play"
          className="absolute inset-0 m-auto w-[68px] h-12 rounded-2xl bg-yt-red/90 hover:bg-yt-red flex items-center justify-center"
        >
          <Play size={26} fill="white" />
        </button>
      )}

      {flash && (
        <div className="absolute top-[12%] left-1/2 -translate-x-1/2 bg-black/60 rounded-md px-3 py-1.5 text-sm font-medium pointer-events-none">
          {flash}
        </div>
      )}

      {captionLines.length > 0 && (
        <div
          className={`absolute inset-x-0 flex flex-col items-center gap-0.5 px-4 pointer-events-none transition-[bottom] ${
            controlsVisible ? 'bottom-16' : 'bottom-6'
          }`}
          aria-live="off"
        >
          {captionLines.map((line, i) => (
            <span
              key={i}
              className="bg-[rgba(8,8,8,0.75)] text-white px-1.5 leading-snug text-[clamp(13px,2.1vw,26px)] text-center"
            >
              {line}
            </span>
          ))}
        </div>
      )}

      {resumeToast !== null && (
        <div className="absolute left-3 bottom-16 flex items-center gap-3 bg-black/75 rounded-lg px-3 py-2 text-sm">
          <span>Resumed at {formatDuration(resumeToast)}</span>
          <button
            type="button"
            className="flex items-center gap-1 font-medium text-[#3ea6ff] hover:text-white"
            onClick={() => {
              seekTo(0)
              setResumeToast(null)
              clearTimeout(toastTimer.current)
            }}
          >
            <RotateCcw size={14} /> Start over
          </button>
        </div>
      )}

      {menuOpen && (
        <SettingsMenu
          captions={captions}
          activeLanguage={activeLanguage}
          speed={speed}
          onCaptions={(lang) => {
            chooseCaptions(lang)
            setMenuOpen(false)
          }}
          onSpeed={(s) => {
            changeSpeed(s)
            setMenuOpen(false)
          }}
        />
      )}

      <div
        className={`absolute inset-x-0 bottom-0 pt-10 px-3 bg-gradient-to-t from-black/80 via-black/30 to-transparent transition-opacity duration-200 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <ProgressBar current={current} duration={duration} buffered={buffered} onSeek={seekTo} />
        <div className="flex items-center gap-1 pb-1 text-white">
          <button type="button" className={ctrl} onClick={togglePlay} aria-label={playing ? 'Pause (k)' : 'Play (k)'} title={playing ? 'Pause (k)' : 'Play (k)'}>
            {playing ? <Pause size={22} fill="white" /> : <Play size={22} fill="white" />}
          </button>
          <div className="group/vol flex items-center">
            <button type="button" className={ctrl} onClick={toggleMute} aria-label={muted ? 'Unmute (m)' : 'Mute (m)'} title={muted ? 'Unmute (m)' : 'Mute (m)'}>
              <VolumeIcon size={22} />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => setVol(Number(e.target.value))}
              aria-label="Volume"
              className="hidden sm:block w-0 opacity-0 group-hover/vol:w-16 group-hover/vol:opacity-100 focus:w-16 focus:opacity-100 transition-all accent-white"
            />
          </div>
          <span className="text-xs sm:text-sm tabular-nums ml-1 whitespace-nowrap">
            {formatDuration(current)} / {formatDuration(duration)}
          </span>
          <div className="flex-1" />
          <button
            type="button"
            className={`${ctrl} relative`}
            onClick={toggleCaptions}
            disabled={!captions.length}
            aria-pressed={!!activeLanguage}
            aria-label="Subtitles/closed captions (c)"
            title={captions.length ? 'Subtitles/closed captions (c)' : 'Subtitles/closed captions unavailable'}
          >
            <Captions size={22} />
            {activeLanguage && <span className="absolute left-2 right-2 bottom-1 h-[3px] rounded bg-yt-red" />}
          </button>
          <button
            type="button"
            className={`${ctrl} transition-transform ${menuOpen ? 'rotate-30' : ''}`}
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={22} />
          </button>
          {!fullscreen && (
            <button
              type="button"
              className={`${ctrl} hidden lg:inline-flex`}
              onClick={() => props.onTheaterChange(!theater)}
              aria-pressed={theater}
              aria-label={theater ? 'Default view (t)' : 'Theater mode (t)'}
              title={theater ? 'Default view (t)' : 'Theater mode (t)'}
            >
              <RectangleHorizontal size={22} strokeWidth={theater ? 2.5 : 2} />
            </button>
          )}
          <button
            type="button"
            className={ctrl}
            onClick={toggleFullscreen}
            aria-label={fullscreen ? 'Exit full screen (f)' : 'Full screen (f)'}
            title={fullscreen ? 'Exit full screen (f)' : 'Full screen (f)'}
          >
            {fullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
          </button>
        </div>
      </div>
    </div>
  )
}
