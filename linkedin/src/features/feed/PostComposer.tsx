import { useState } from 'react'
import { Image, Link2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { authHeaders } from '@/hooks/useAuth'
import { useAuth } from '@/hooks/useAuth'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { PostVisibility } from '@/types'

export function PostComposer() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [visibility, setVisibility] = useState<PostVisibility>('anyone')
  const queryClient = useQueryClient()

  const createPost = useMutation({
    mutationFn: () =>
      api('/posts', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ content, imageUrl: imageUrl || undefined, visibility }),
      }),
    onSuccess: () => {
      setContent('')
      setImageUrl('')
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })

  if (!open) {
    return (
      <Card className="flex gap-3 items-center cursor-pointer" onClick={() => setOpen(true)}>
        <Avatar src={user?.avatarUrl} name={`${user?.firstName} ${user?.lastName}`} />
        <button className="flex-1 text-left px-4 py-3 rounded-full border border-linkedin-border text-linkedin-muted hover:bg-gray-50 text-sm">
          Start a post
        </button>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex gap-3 mb-3">
        <Avatar src={user?.avatarUrl} name={`${user?.firstName} ${user?.lastName}`} />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What do you want to talk about?"
          className="flex-1 resize-none border-0 focus:outline-none text-sm min-h-[80px]"
          autoFocus
        />
      </div>
      {imageUrl && (
        <img src={imageUrl} alt="" className="rounded mb-3 max-h-48 object-cover w-full" />
      )}
      <input
        type="url"
        placeholder="Image URL (optional)"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        className="w-full text-xs border rounded px-2 py-1 mb-3"
      />
      <div className="flex items-center justify-between border-t pt-3">
        <div className="flex gap-2">
          <button type="button" className="flex items-center gap-1 text-sm text-linkedin-muted hover:bg-gray-100 px-2 py-1 rounded">
            <Image size={20} className="text-green-600" /> Photo
          </button>
          <button type="button" className="flex items-center gap-1 text-sm text-linkedin-muted hover:bg-gray-100 px-2 py-1 rounded">
            <Link2 size={20} className="text-amber-600" /> Article
          </button>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as PostVisibility)}
            className="text-xs border rounded px-2 py-1"
          >
            <option value="anyone">Anyone</option>
            <option value="connections">Connections only</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!content.trim() || createPost.isPending}
            onClick={() => createPost.mutate()}
          >
            Post
          </Button>
        </div>
      </div>
    </Card>
  )
}
