import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { SAMPLE_VIDEO_URL, CATEGORIES } from '@/lib/constants'

export function UploadPage() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.accessToken)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [videoUrl, setVideoUrl] = useState(SAMPLE_VIDEO_URL)
  const [category, setCategory] = useState('Education')
  const upload = useMutation({
    mutationFn: () =>
      api<{ id: string }>('/videos', {
        method: 'POST',
        headers: authHeaders(token!),
        body: JSON.stringify({ title, description, videoUrl, category }),
      }),
    onSuccess: (res) => navigate(`/watch/${res.id}`),
  })
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-6">Upload video</h1>
      <div className="space-y-4">
        <label className="block text-sm text-yt-muted">Video URL<input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="w-full mt-1 bg-yt-surface rounded-lg px-3 py-2 text-sm" /></label>
        <label className="block text-sm text-yt-muted">Title<input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full mt-1 bg-yt-surface rounded-lg px-3 py-2 text-sm" /></label>
        <label className="block text-sm text-yt-muted">Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full mt-1 bg-yt-surface rounded-lg px-3 py-2 text-sm min-h-[100px]" /></label>
        <label className="block text-sm text-yt-muted">Category
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full mt-1 bg-yt-surface rounded-lg px-3 py-2 text-sm">
            {CATEGORIES.filter((c) => c !== 'All').map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <button type="button" disabled={!title || upload.isPending} onClick={() => upload.mutate()} className="bg-yt-red hover:bg-yt-red-dark text-white font-medium px-6 py-2 rounded-full">
          Publish
        </button>
      </div>
    </div>
  )
}
