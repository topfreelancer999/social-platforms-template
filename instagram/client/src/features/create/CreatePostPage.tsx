import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { SAMPLE_IMAGE, SAMPLE_REEL_VIDEO } from '@/lib/constants'
import { Button } from '@/components/ui/Button'

export function CreatePostPage() {
  const token = useAuthStore((s) => s.accessToken)
  const navigate = useNavigate()
  const [mode, setMode] = useState<'post' | 'reel' | 'story'>('post')
  const [caption, setCaption] = useState('')
  const [imageUrl, setImageUrl] = useState(SAMPLE_IMAGE)

  const submit = useMutation({
    mutationFn: async () => {
      if (mode === 'story') {
        return api('/stories', {
          method: 'POST',
          headers: authHeaders(token!),
          body: JSON.stringify({ imageUrl }),
        })
      }
      return api('/posts', {
        method: 'POST',
        headers: authHeaders(token!),
        body: JSON.stringify({
          caption,
          imageUrl: mode === 'post' ? imageUrl : imageUrl,
          videoUrl: mode === 'reel' ? SAMPLE_REEL_VIDEO : undefined,
          type: mode === 'reel' ? 'REEL' : 'POST',
        }),
      })
    },
    onSuccess: () => navigate(mode === 'reel' ? '/reels' : '/'),
  })

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">Create</h1>
      <div className="flex gap-2 mb-4">
        {(['post', 'reel', 'story'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 rounded-lg text-sm capitalize ${mode === m ? 'ig-gradient text-white' : 'bg-ig-surface border border-ig-border'}`}
          >
            {m}
          </button>
        ))}
      </div>
      <img src={imageUrl} alt="" className="w-full aspect-square object-cover rounded-lg mb-4 bg-ig-surface" />
      <input
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        className="w-full mb-3 bg-ig-surface border border-ig-border rounded-lg px-3 py-2 text-sm"
        placeholder="Image URL"
      />
      {mode !== 'story' && (
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption..."
          className="w-full h-24 bg-ig-surface border border-ig-border rounded-lg px-3 py-2 text-sm mb-4 resize-none"
        />
      )}
      <Button onClick={() => submit.mutate()} className="w-full bg-ig-blue hover:bg-ig-blue-hover">
        Share
      </Button>
    </div>
  )
}
