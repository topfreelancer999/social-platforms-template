import { useRef, useState } from 'react'
import { CircleArrowUp, RefreshCw, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ACCEPTED_IMAGE_TYPES } from '@/lib/upload'

export type PickerPreview = {
  url: string
  width?: number
  height?: number
  color?: string | null
  /** 0..1 while uploading, null once the image is ready. */
  progress: number | null
  caption: string
}

/**
 * Pinterest-style image drop zone: click to browse, drag and drop, or paste (handled by the page).
 * Once an image is chosen it shows the preview with upload progress and Replace / Remove actions.
 */
export function ImagePicker({
  preview,
  onFile,
  onRemove,
}: {
  preview: PickerPreview | null
  onFile: (file: File) => void
  onRemove: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes('Files')) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      setDragging(true)
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false)
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) onFile(file)
    },
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPTED_IMAGE_TYPES.join(',')}
      className="sr-only"
      aria-label="Choose an image"
      onChange={(e) => {
        const file = e.target.files?.[0]
        // Reset so picking the same file again still fires change.
        e.target.value = ''
        if (file) onFile(file)
      }}
    />
  )

  if (!preview) {
    return (
      <label
        {...dropHandlers}
        className={cn(
          'relative flex aspect-[3/4] w-full cursor-pointer flex-col items-center justify-center rounded-[32px] border-2 border-dashed px-6 text-center transition',
          'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#0074e8]',
          dragging
            ? 'border-[var(--pin-red)] bg-[#fdecef]'
            : 'border-[#dadada] bg-[#e9e9e9] hover:bg-[#e2e2e2]',
        )}
      >
        {input}
        <CircleArrowUp size={36} strokeWidth={1.75} className="text-[#111]" />
        <span className="mt-4 max-w-[15rem] text-base font-medium leading-snug text-[#111]">
          {dragging ? 'Drop your image here' : 'Choose a file or drag and drop it here'}
        </span>
        <span className="absolute inset-x-6 bottom-6 text-xs leading-snug text-[var(--pin-gray)]">
          We recommend using high quality .jpg files less than 20 MB
        </span>
      </label>
    )
  }

  const uploading = preview.progress !== null
  const percent = Math.round((preview.progress ?? 1) * 100)
  return (
    <div {...dropHandlers} className="relative">
      {input}
      <div
        className={cn('relative overflow-hidden rounded-[32px] bg-[#efefef]', dragging && 'ring-4 ring-[var(--pin-red)]')}
        style={{
          aspectRatio: preview.width && preview.height ? `${preview.width} / ${preview.height}` : undefined,
          backgroundColor: preview.color ?? undefined,
        }}
      >
        <img
          src={preview.url}
          alt="Selected image preview"
          className={cn('block h-full w-full object-cover transition', uploading && 'opacity-70')}
        />
        {uploading ? (
          <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-white/95 p-3 shadow">
            <div className="flex items-center justify-between gap-2 text-sm font-semibold">
              <span>{percent < 100 ? `Uploading… ${percent}%` : 'Processing…'}</span>
              <button
                type="button"
                onClick={onRemove}
                className="rounded-full p-1 hover:bg-[#efefef]"
                aria-label="Cancel upload"
                title="Cancel upload"
              >
                <X size={16} />
              </button>
            </div>
            <div
              role="progressbar"
              aria-label="Upload progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e2e2e2]"
            >
              <div className="h-full rounded-full bg-[var(--pin-red)] transition-[width]" style={{ width: `${percent}%` }} />
            </div>
          </div>
        ) : (
          <div className="absolute right-3 top-3 flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-2 text-sm font-semibold shadow hover:bg-white"
            >
              <RefreshCw size={15} /> Replace
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="rounded-full bg-white/95 p-2 shadow hover:bg-white"
              aria-label="Remove image"
              title="Remove image"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
      <p className="mt-2 truncate px-2 text-xs text-[var(--pin-gray)]">{preview.caption}</p>
    </div>
  )
}
