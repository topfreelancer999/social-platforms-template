import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { Link2 } from 'lucide-react'
import { api, authHeaders } from '@/lib/api'
import {
  formatBytes,
  measureRemoteImage,
  readImageInfo,
  uploadPinImage,
  validateImageFile,
  type ImageInfo,
  type UploadedImage,
} from '@/lib/upload'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { ImagePicker, type PickerPreview } from './ImagePicker'
import { invalidatePinLists } from './queries'

const TITLE_MAX = 100
const DESCRIPTION_MAX = 500

type Picked =
  | { kind: 'none' }
  | { kind: 'file'; file: File; previewUrl: string; info: ImageInfo | null; progress: number; upload: UploadedImage | null }
  | { kind: 'url'; url: string; width: number; height: number }

function discardUpload(id: string) {
  const token = useAuthStore.getState().accessToken
  // keepalive lets the request finish even when it is sent while leaving the page.
  api(`/uploads/pins/${id}`, { method: 'DELETE', headers: authHeaders(token), keepalive: true }).catch(() => {})
}

const fieldClass =
  'w-full rounded-2xl border-2 border-[#cdcdcd] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0074e8]'

export function CreatePinPage() {
  const token = useAuthStore((s) => s.accessToken)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [boardId, setBoardId] = useState('')
  const [picked, setPicked] = useState<Picked>({ kind: 'none' })
  const [imageError, setImageError] = useState<string | null>(null)
  const [urlOpen, setUrlOpen] = useState(false)
  const [remoteUrl, setRemoteUrl] = useState('')
  const [measuring, setMeasuring] = useState(false)

  // Bumped on every new pick so late callbacks from a superseded upload are ignored.
  const attemptRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  // An uploaded-but-unpublished image, discarded if the user leaves without publishing.
  const pendingUploadRef = useRef<string | null>(null)

  const boardsQuery = useQuery({
    queryKey: ['my-boards'],
    queryFn: () => api<{ boards: { id: string; name: string }[] }>('/boards', { headers: authHeaders(token!) }),
    enabled: !!token,
  })
  const boards = boardsQuery.data?.boards ?? []
  const selectedBoardId = boardId || boards[0]?.id || ''

  const previewUrl = picked.kind === 'file' ? picked.previewUrl : null
  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  useEffect(
    () => () => {
      abortRef.current?.abort()
      if (pendingUploadRef.current) discardUpload(pendingUploadRef.current)
    },
    [],
  )

  /** Cancels an in-flight upload and deletes an unpublished one. */
  function discardCurrent() {
    attemptRef.current++
    abortRef.current?.abort()
    abortRef.current = null
    if (pendingUploadRef.current) discardUpload(pendingUploadRef.current)
    pendingUploadRef.current = null
  }

  function selectFile(file: File) {
    const invalid = validateImageFile(file)
    if (invalid) {
      setImageError(invalid)
      return
    }
    discardCurrent()
    const attempt = attemptRef.current
    const isCurrent = () => attemptRef.current === attempt
    const controller = new AbortController()
    abortRef.current = controller
    setImageError(null)
    setPicked({ kind: 'file', file, previewUrl: URL.createObjectURL(file), info: null, progress: 0, upload: null })

    readImageInfo(file)
      .then((info) => {
        if (isCurrent()) setPicked((p) => (p.kind === 'file' ? { ...p, info } : p))
      })
      .catch(() => {
        // The server is the authority on validity; without local info we just lose the placeholder color.
      })

    uploadPinImage(file, token, {
      signal: controller.signal,
      onProgress: (progress) => {
        if (isCurrent()) setPicked((p) => (p.kind === 'file' ? { ...p, progress } : p))
      },
    })
      .then((upload) => {
        if (!isCurrent()) return discardUpload(upload.id)
        pendingUploadRef.current = upload.id
        abortRef.current = null
        setPicked((p) => (p.kind === 'file' ? { ...p, upload, progress: 1 } : p))
      })
      .catch((err: Error) => {
        if (!isCurrent() || err.name === 'AbortError') return
        abortRef.current = null
        setPicked({ kind: 'none' })
        setImageError(err.message)
      })
  }

  function removeImage() {
    discardCurrent()
    setPicked({ kind: 'none' })
    setImageError(null)
  }

  const onPaste = useEffectEvent((e: ClipboardEvent) => {
    const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/'))
    if (!file) return
    e.preventDefault()
    selectFile(file)
  })
  useEffect(() => {
    const handler = (e: ClipboardEvent) => onPaste(e)
    window.addEventListener('paste', handler)
    return () => window.removeEventListener('paste', handler)
  }, [])

  async function submitRemoteUrl(e: React.FormEvent) {
    e.preventDefault()
    const url = remoteUrl.trim()
    if (!/^https?:\/\/\S+$/i.test(url)) {
      setImageError('Enter a full image URL starting with http:// or https://')
      return
    }
    setMeasuring(true)
    try {
      const size = await measureRemoteImage(url)
      discardCurrent()
      setPicked({ kind: 'url', url, ...size })
      setImageError(null)
      setUrlOpen(false)
    } catch (err) {
      setImageError((err as Error).message)
    } finally {
      setMeasuring(false)
    }
  }

  const image =
    picked.kind === 'file' && picked.upload
      ? { uploadId: picked.upload.id, dominantColor: picked.info?.dominantColor ?? undefined }
      : picked.kind === 'url'
        ? { imageUrl: picked.url, imageWidth: picked.width, imageHeight: picked.height }
        : null

  const publish = useMutation({
    mutationFn: () =>
      api<{ pin: { id: string } }>('/pins', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({
          ...image,
          title,
          description,
          linkUrl: linkUrl.trim() || undefined,
          boardId: selectedBoardId || undefined,
        }),
      }),
    onSuccess: (res) => {
      pendingUploadRef.current = null
      invalidatePinLists(qc)
      navigate(`/pin/${res.pin.id}`)
    },
  })

  const uploading = picked.kind === 'file' && !picked.upload
  const canPublish = !!image && !!title.trim() && !publish.isPending
  const hint = uploading
    ? 'Waiting for the upload to finish…'
    : !image
      ? 'Add an image to publish your Pin'
      : !title.trim()
        ? 'Add a title to publish your Pin'
        : null

  let preview: PickerPreview | null = null
  if (picked.kind === 'file') {
    const size = picked.upload ?? picked.info
    preview = {
      url: picked.previewUrl,
      width: size?.width,
      height: size?.height,
      color: picked.info?.dominantColor,
      progress: picked.upload ? null : picked.progress,
      caption: [picked.file.name, size && `${size.width} × ${size.height}`, formatBytes(picked.file.size)]
        .filter(Boolean)
        .join(' · '),
    }
  } else if (picked.kind === 'url') {
    preview = {
      url: picked.url,
      width: picked.width,
      height: picked.height,
      progress: null,
      caption: `${picked.url} · ${picked.width} × ${picked.height}`,
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between gap-3 border-b border-[var(--pin-border)] pb-4">
        <h1 className="text-xl font-bold sm:text-2xl">Create Pin</h1>
        <Button
          type="submit"
          form="create-pin-form"
          className="rounded-full bg-[var(--pin-red)] px-5 py-2.5 text-white hover:bg-[var(--pin-red-hover)]"
          disabled={!canPublish}
        >
          {publish.isPending ? 'Publishing…' : 'Publish'}
        </Button>
      </div>

      <div className="grid gap-8 md:grid-cols-[minmax(0,375px)_minmax(0,1fr)]">
        <div className="min-w-0">
          <ImagePicker preview={preview} onFile={selectFile} onRemove={removeImage} />
          {imageError && (
            <p role="alert" className="mt-3 rounded-2xl bg-[#fdecef] px-4 py-3 text-sm font-medium text-[#b60000]">
              {imageError}
            </p>
          )}

          <div className="mt-4 border-t border-[var(--pin-border)] pt-4">
            {urlOpen ? (
              <form onSubmit={submitRemoteUrl} className="flex gap-2">
                <input
                  type="url"
                  value={remoteUrl}
                  onChange={(e) => setRemoteUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  aria-label="Image URL"
                  className={`${fieldClass} min-w-0 flex-1 rounded-full py-2`}
                  autoFocus
                />
                <Button type="submit" variant="secondary" className="rounded-full" disabled={measuring || !remoteUrl.trim()}>
                  {measuring ? 'Loading…' : 'Use'}
                </Button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setUrlOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#e9e9e9] px-4 py-2.5 text-sm font-semibold hover:bg-[#e2e2e2]"
              >
                <Link2 size={16} /> Save from URL
              </button>
            )}
          </div>
        </div>

        <form
          id="create-pin-form"
          className="min-w-0 space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (canPublish) publish.mutate()
          }}
        >
          <label className="block">
            <span className="mb-1.5 flex justify-between text-xs font-medium">
              Title
              <span className="text-[var(--pin-gray)]">
                {title.length}/{TITLE_MAX}
              </span>
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={TITLE_MAX}
              placeholder="Add a title"
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 flex justify-between text-xs font-medium">
              Description
              <span className="text-[var(--pin-gray)]">
                {description.length}/{DESCRIPTION_MAX}
              </span>
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={DESCRIPTION_MAX}
              rows={4}
              placeholder="Add a detailed description"
              className={`${fieldClass} resize-y`}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium">Link</span>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="Add a link"
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium">Board</span>
            <select
              value={selectedBoardId}
              onChange={(e) => setBoardId(e.target.value)}
              disabled={boardsQuery.isLoading || !boards.length}
              className={`${fieldClass} disabled:bg-[#f5f5f5]`}
            >
              {boardsQuery.isLoading && <option value="">Loading boards…</option>}
              {!boardsQuery.isLoading && !boards.length && <option value="">No boards yet — saved to your profile</option>}
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {boardsQuery.isError && (
              <span className="mt-1 block text-xs text-[#b60000]">Couldn't load your boards: {boardsQuery.error.message}</span>
            )}
          </label>

          {publish.isError && (
            <p role="alert" className="rounded-2xl bg-[#fdecef] px-4 py-3 text-sm font-medium text-[#b60000]">
              {publish.error.message}
            </p>
          )}
          {hint && <p className="text-sm text-[var(--pin-gray)]">{hint}</p>}
        </form>
      </div>
    </div>
  )
}
