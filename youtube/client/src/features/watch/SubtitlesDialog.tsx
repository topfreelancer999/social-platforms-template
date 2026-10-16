import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Upload, X } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import type { CaptionTrack } from './player/types'

const LANGUAGES = [
  ['en', 'English'],
  ['es', 'Spanish'],
  ['fr', 'French'],
  ['de', 'German'],
  ['pt-BR', 'Portuguese (Brazil)'],
  ['it', 'Italian'],
  ['ja', 'Japanese'],
  ['ko', 'Korean'],
  ['hi', 'Hindi'],
  ['ar', 'Arabic'],
] as const

/** Creator-only: upload (.vtt) or remove subtitle tracks for a video. */
export function SubtitlesDialog({ videoId, captions, onClose }: {
  videoId: string
  captions: CaptionTrack[]
  onClose: () => void
}) {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const [language, setLanguage] = useState<string>('en')
  const [content, setContent] = useState('')
  const [fileName, setFileName] = useState('')
  const label = LANGUAGES.find(([code]) => code === language)?.[1] ?? language

  const refresh = () => qc.invalidateQueries({ queryKey: ['watch', videoId] })
  const upload = useMutation({
    mutationFn: () =>
      api<CaptionTrack[]>(`/videos/${videoId}/captions`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ language, label, content }),
      }),
    onSuccess: () => {
      setContent('')
      setFileName('')
      refresh()
    },
  })
  const remove = useMutation({
    mutationFn: (captionId: string) =>
      api(`/videos/${videoId}/captions/${captionId}`, { method: 'DELETE', headers: authHeaders(token) }),
    onSuccess: refresh,
  })

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Subtitles"
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-yt-surface rounded-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Subtitles</h2>
          <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-yt-hover" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <h3 className="text-sm text-yt-muted mb-2">Published</h3>
        {captions.length === 0 && <p className="text-sm text-yt-muted mb-4">No subtitles yet.</p>}
        <ul className="mb-5 divide-y divide-yt-hover">
          {captions.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {c.label} <span className="text-yt-muted">· {c.language}</span>
              </span>
              <button
                type="button"
                onClick={() => remove.mutate(c.id)}
                disabled={remove.isPending}
                className="p-2 rounded-full hover:bg-yt-hover text-yt-muted hover:text-white"
                aria-label={`Delete ${c.label} subtitles`}
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (content) upload.mutate()
          }}
          className="space-y-3"
        >
          <h3 className="text-sm text-yt-muted">Add or replace a language</h3>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full bg-yt-bg border border-yt-hover rounded-lg px-3 py-2 text-sm"
            aria-label="Language"
          >
            {LANGUAGES.map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 w-fit cursor-pointer bg-yt-hover hover:bg-yt-hover/80 rounded-full px-4 py-2 text-sm">
            <Upload size={16} /> {fileName || 'Upload .vtt file'}
            <input
              type="file"
              accept=".vtt,text/vtt"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setFileName(file.name)
                setContent(await file.text())
              }}
            />
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            placeholder={'…or paste WebVTT:\n\nWEBVTT\n\n00:00:00.000 --> 00:00:04.000\nHello and welcome!'}
            className="w-full bg-yt-bg border border-yt-hover rounded-lg px-3 py-2 text-xs font-mono"
          />
          {upload.isError && <p className="text-sm text-red-400">{(upload.error as Error).message}</p>}
          {remove.isError && <p className="text-sm text-red-400">{(remove.error as Error).message}</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!content || upload.isPending}
              className="bg-[#3ea6ff] text-black font-medium rounded-full px-4 py-2 text-sm disabled:opacity-50"
            >
              {upload.isPending ? 'Publishing…' : 'Publish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
