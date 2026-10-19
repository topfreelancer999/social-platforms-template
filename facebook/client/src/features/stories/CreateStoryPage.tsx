import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, Globe, ImageIcon, Type, Users } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { StoryThumb } from './StoryThumb'
import { SAMPLE_PHOTOS, STORY_BACKGROUNDS, type StoryAudience, type StoryType } from './stories'

export function CreateStoryPage() {
  const { user, accessToken } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [mode, setMode] = useState<StoryType | null>(null)
  const [text, setText] = useState('')
  const [background, setBackground] = useState('blue')
  const [mediaUrl, setMediaUrl] = useState('')
  const [audience, setAudience] = useState<StoryAudience>('FRIENDS')

  const share = useMutation({
    mutationFn: () =>
      api('/stories', {
        method: 'POST',
        headers: authHeaders(accessToken),
        body: JSON.stringify(
          mode === 'TEXT'
            ? { type: 'TEXT', text, background, audience }
            : { type: 'PHOTO', mediaUrl, text: text || undefined, audience },
        ),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stories'] })
      navigate('/')
    },
  })

  const reset = () => { setMode(null); setText(''); setMediaUrl(''); share.reset() }
  const canShare = mode === 'TEXT' ? text.trim().length > 0 : mediaUrl.trim().length > 0

  if (!mode) {
    return (
      <div>
        <Card className="mb-4 flex items-center gap-3 p-3">
          <Link to="/" aria-label="Back to Feed" className="rounded-full p-2 hover:bg-[#f0f2f5]"><ArrowLeft size={20} /></Link>
          <h1 className="text-xl font-bold">Create story</h1>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setMode('PHOTO')} className="flex aspect-[3/4] flex-col items-center justify-center gap-3 rounded-xl text-white shadow-sm transition-transform hover:scale-[1.02]" style={{ background: 'linear-gradient(160deg, #3a86ff 0%, #6c3cff 100%)' }}>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-fb-text shadow"><ImageIcon size={22} /></span>
            <span className="font-semibold">Create a photo story</span>
          </button>
          <button onClick={() => setMode('TEXT')} className="flex aspect-[3/4] flex-col items-center justify-center gap-3 rounded-xl text-white shadow-sm transition-transform hover:scale-[1.02]" style={{ background: 'linear-gradient(160deg, #e1306c 0%, #a044ff 100%)' }}>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-fb-text shadow"><Type size={22} /></span>
            <span className="font-semibold">Create a text story</span>
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-fb-muted">Stories disappear after 24 hours.</p>
      </div>
    )
  }

  const preview = mode === 'TEXT'
    ? { type: 'TEXT' as const, text: text || 'Start typing', background, mediaUrl: null }
    : { type: 'PHOTO' as const, mediaUrl: mediaUrl.trim() || null, text: null, background: 'night' }

  return (
    <div>
      <Card className="mb-4 flex items-center gap-3 p-3">
        <button onClick={reset} aria-label="Back" className="rounded-full p-2 hover:bg-[#f0f2f5]"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-bold">{mode === 'TEXT' ? 'Text story' : 'Photo story'}</h1>
      </Card>
      <div className="flex flex-col gap-4 md:flex-row">
        <Card className="flex-1 space-y-4 p-4">
          {mode === 'TEXT' ? (
            <>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-fb-muted">Text</span>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={250}
                  rows={4}
                  autoFocus
                  placeholder="Start typing"
                  className="w-full resize-none rounded-lg border border-fb-border p-3 text-sm focus:outline-none focus:ring-1 focus:ring-fb-primary"
                />
                <span className="block text-right text-xs text-fb-muted">{text.length}/250</span>
              </label>
              <div>
                <span className="mb-2 block text-sm font-medium text-fb-muted">Backgrounds</span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STORY_BACKGROUNDS).map(([key, bg]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setBackground(key)}
                      aria-label={bg.label}
                      aria-pressed={background === key}
                      className={cn('flex h-9 w-9 items-center justify-center rounded-full text-white ring-offset-2', background === key && 'ring-2 ring-fb-primary')}
                      style={{ background: bg.css }}
                    >
                      {background === key && <Check size={16} />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-fb-muted">Photo URL</span>
                <input
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  type="url"
                  placeholder="https://…"
                  className="w-full rounded-lg border border-fb-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-fb-primary"
                />
              </label>
              <div>
                <span className="mb-2 block text-sm font-medium text-fb-muted">Or pick a photo</span>
                <div className="grid grid-cols-6 gap-1.5">
                  {SAMPLE_PHOTOS.map((url) => (
                    <button key={url} type="button" onClick={() => setMediaUrl(url)} aria-label="Use sample photo" className={cn('aspect-[9/16] overflow-hidden rounded-md bg-[#e4e6eb]', mediaUrl === url && 'ring-2 ring-fb-primary ring-offset-1')}>
                      <img src={url.replace('/720/1280', '/90/160')} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-fb-muted">Caption (optional)</span>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={120}
                  placeholder="Add a caption"
                  className="w-full rounded-lg border border-fb-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-fb-primary"
                />
              </label>
            </>
          )}
          <div>
            <span className="mb-2 block text-sm font-medium text-fb-muted">Who can see your story?</span>
            <div className="flex gap-2">
              {([['FRIENDS', 'Friends', Users], ['PUBLIC', 'Public', Globe]] as const).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAudience(value)}
                  aria-pressed={audience === value}
                  className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold', audience === value ? 'bg-[#e7f3ff] text-fb-primary' : 'bg-[#e4e6eb]')}
                >
                  <Icon size={16} /> {label}
                </button>
              ))}
            </div>
          </div>
          {share.isError && <p className="text-sm text-red-600" role="alert">{share.error.message}</p>}
          <div className="flex justify-end gap-2 border-t border-fb-border pt-3">
            <Button variant="secondary" onClick={reset}>Discard</Button>
            <Button onClick={() => share.mutate()} disabled={!canShare || share.isPending}>{share.isPending ? 'Sharing…' : 'Share to story'}</Button>
          </div>
        </Card>
        <Card className="p-4 md:w-[260px] shrink-0">
          <p className="mb-2 text-sm font-semibold">Preview</p>
          <div className="relative mx-auto aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-xl bg-[#1c1e21]">
            {preview.mediaUrl || mode === 'TEXT' ? (
              <StoryThumb story={preview} className="absolute inset-0 h-full w-full" textClassName={cn('text-lg', !text && 'opacity-70')} />
            ) : (
              <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white/70">Add a photo to see the preview</p>
            )}
            <img src={user?.avatarUrl} alt="" className="absolute left-2 top-2 h-8 w-8 rounded-full border-2 border-fb-primary object-cover" />
            {mode === 'PHOTO' && text && <p className="absolute inset-x-3 bottom-4 text-center text-sm font-semibold text-white drop-shadow">{text}</p>}
          </div>
        </Card>
      </div>
    </div>
  )
}
