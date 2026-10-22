import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LoaderCircle, Music2, X } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { SAMPLE_VIDEO_URL } from '@/lib/constants'
import { BottomNav } from '@/components/layout/BottomNav'
import type { VideoItem } from '@/features/feed/types'
import { SoundCover } from '@/features/sounds/SoundRow'
import { SoundPicker } from '@/features/sounds/SoundPicker'
import { soundLabel } from '@/features/sounds/types'
import { useSound } from '@/features/sounds/useSounds'

export function UploadPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const token = useAuthStore((s) => s.accessToken)
  const me = useAuthStore((s) => s.user)
  const [searchParams] = useSearchParams()
  const [caption, setCaption] = useState('#fyp #viral ')
  const [videoUrl, setVideoUrl] = useState(SAMPLE_VIDEO_URL)
  // "Use this sound" links here with ?sound=<id> preselected.
  const [soundId, setSoundId] = useState<string | null>(() => searchParams.get('sound'))
  const [pickerOpen, setPickerOpen] = useState(false)
  const sound = useSound(soundId)

  const upload = useMutation({
    mutationFn: () =>
      api<VideoItem>('/videos', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ videoUrl, caption, soundId: soundId ?? undefined }),
      }),
    onSuccess: (video) => {
      qc.invalidateQueries({ queryKey: ['video-feed'] })
      qc.invalidateQueries({ queryKey: ['profile'] })
      qc.invalidateQueries({ queryKey: ['sounds'] })
      if (video.sound?.id) {
        qc.invalidateQueries({ queryKey: ['sound', video.sound.id] })
        qc.invalidateQueries({ queryKey: ['sound-videos', video.sound.id] })
      }
      navigate(`/video/${video.id}`)
    },
  })

  const myName = me ? `${me.firstName} ${me.lastName}`.trim() || me.username : 'you'

  return (
    <div className="h-[100dvh] overflow-y-auto bg-black text-white">
      <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
        <h1 className="text-xl font-bold mb-4">Upload video</h1>

        {/* TikTok puts the sound pill at the top of the editor. */}
        <div className="mb-5">
          {soundId ? (
            <div className="flex items-center gap-3 rounded-lg bg-white/10 p-2 pr-1">
              {sound.data ? (
                <>
                  <SoundCover sound={sound.data} className="h-11 w-11" />
                  <button type="button" onClick={() => setPickerOpen(true)} className="min-w-0 flex-1 text-left">
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      <Music2 size={14} className="shrink-0" />
                      <span className="truncate">{soundLabel(sound.data)}</span>
                    </span>
                    <span className="text-xs text-tt-muted">Tap to change sound</span>
                  </button>
                </>
              ) : sound.isError ? (
                <p className="flex-1 px-2 text-sm text-tt-primary">This sound isn&apos;t available</p>
              ) : (
                <div className="flex flex-1 items-center gap-2 px-2 text-sm text-tt-muted">
                  <LoaderCircle size={16} className="animate-spin" /> Loading sound…
                </div>
              )}
              <button
                type="button"
                onClick={() => setSoundId(null)}
                aria-label="Remove sound"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="mx-auto flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
              >
                <Music2 size={16} /> Add sound
              </button>
              <p className="mt-2 text-center text-xs text-tt-muted">
                No sound picked: your video keeps its audio as “original sound - {myName}”.
              </p>
            </>
          )}
        </div>

        <label className="block text-sm text-tt-muted mb-1" htmlFor="upload-url">Video URL</label>
        <input
          id="upload-url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm mb-4"
        />
        <label className="block text-sm text-tt-muted mb-1" htmlFor="upload-caption">Caption</label>
        <textarea
          id="upload-caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm min-h-[80px] mb-4"
        />
        {upload.isError && <p className="mb-3 text-sm text-tt-primary">{upload.error.message}</p>}
        <button
          type="button"
          onClick={() => upload.mutate()}
          disabled={upload.isPending || !videoUrl.trim()}
          className="flex w-full items-center justify-center gap-2 bg-tt-primary font-bold py-3 rounded-lg disabled:opacity-60"
        >
          {upload.isPending && <LoaderCircle size={18} className="animate-spin" />}
          Post
        </button>
      </div>
      {pickerOpen && (
        <SoundPicker
          selectedId={soundId}
          onSelect={(s) => {
            setSoundId(s.id)
            setPickerOpen(false)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
      <BottomNav active="upload" />
    </div>
  )
}
