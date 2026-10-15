import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { SAMPLE_VIDEO_URL } from '@/lib/constants'
import { BottomNav } from '@/components/layout/BottomNav'

export function UploadPage() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.accessToken)
  const [caption, setCaption] = useState('#fyp #viral ')
  const [videoUrl, setVideoUrl] = useState(SAMPLE_VIDEO_URL)
  const { data: sounds } = useQuery({
    queryKey: ['sounds'],
    queryFn: () => api<{ id: string; title: string }[]>('/sounds', { headers: authHeaders(token) }),
  })
  const [soundId, setSoundId] = useState('')
  const upload = useMutation({
    mutationFn: () =>
      api('/videos', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ videoUrl, caption, soundId: soundId || undefined }),
      }),
    onSuccess: () => navigate('/'),
  })
  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20 px-4 pt-6">
      <h1 className="text-xl font-bold mb-4">Upload video</h1>
      <label className="block text-sm text-tt-muted mb-1">Video URL</label>
      <input
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
        className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm mb-4"
      />
      <label className="block text-sm text-tt-muted mb-1">Caption</label>
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm min-h-[80px] mb-4"
      />
      <label className="block text-sm text-tt-muted mb-1">Sound</label>
      <select
        value={soundId}
        onChange={(e) => setSoundId(e.target.value)}
        className="w-full bg-white/10 rounded-lg px-3 py-2 text-sm mb-6"
      >
        <option value="">None</option>
        {sounds?.map((s) => (
          <option key={s.id} value={s.id}>{s.title}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => upload.mutate()}
        disabled={upload.isPending}
        className="w-full bg-tt-primary font-bold py-3 rounded-lg"
      >
        Post
      </button>
      <BottomNav active="upload" />
    </div>
  )
}
