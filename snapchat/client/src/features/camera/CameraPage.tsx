import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const PRESETS = [
  'https://picsum.photos/seed/cam1/540/960',
  'https://picsum.photos/seed/cam2/540/960',
  'https://picsum.photos/seed/cam3/540/960',
]

export function CameraPage() {
  const [imageUrl, setImageUrl] = useState(PRESETS[0])
  const [caption, setCaption] = useState('')
  const [mode, setMode] = useState<'SNAP' | 'STORY' | 'SPOTLIGHT'>('STORY')
  const navigate = useNavigate()
  const qc = useQueryClient()
  const token = useAuthStore((s) => s.accessToken)

  // SNAP mode sends privately to friends (and counts towards Snapstreaks) via the Send Snap page.
  const sendToFriends = () => navigate(`/snap/new?image=${encodeURIComponent(imageUrl)}`)

  const send = useMutation({
    mutationFn: () =>
      api('/snaps', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ imageUrl, caption, type: mode }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stories'] })
      qc.invalidateQueries({ queryKey: ['spotlight'] })
      navigate('/')
    },
  })

  return (
    <div className="flex flex-col">
      <div className="relative aspect-[9/16] w-full bg-zinc-900">
        <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
        <div className="sc-gradient absolute inset-0" />
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4">
          {PRESETS.map((url) => (
            <button
              key={url}
              type="button"
              onClick={() => setImageUrl(url)}
              className={`h-12 w-12 overflow-hidden rounded-lg border-2 ${
                imageUrl === url ? 'border-[var(--sc-yellow)]' : 'border-transparent'
              }`}
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex gap-2">
          {(['SNAP', 'STORY', 'SPOTLIGHT'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-full px-3 py-1 text-sm ${
                mode === m ? 'bg-[var(--sc-yellow)] text-black' : 'bg-white/10'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <Input
          placeholder="Add caption…"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="bg-white/10 text-white"
        />
        <Button
          className="w-full bg-[var(--sc-yellow)] text-black hover:opacity-90"
          disabled={send.isPending}
          onClick={() => (mode === 'SNAP' ? sendToFriends() : send.mutate())}
        >
          {send.isPending ? 'Sending…' : mode === 'SNAP' ? 'Send to friends…' : `Send ${mode}`}
        </Button>
        <p className="text-center text-xs text-white/50">Demo: picks a preset image (no real camera)</p>
      </div>
    </div>
  )
}
