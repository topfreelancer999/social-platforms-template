import { API } from './api'

/** Mirrors the server limits (MAX_UPLOAD_MB and the sniffed formats) for instant feedback. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export type UploadedImage = {
  id: string
  url: string
  width: number
  height: number
  mimeType: string
  bytes: number
}

export type ImageInfo = { width: number; height: number; dominantColor: string | null }

export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** Returns a friendly error for files the server would reject, or null. */
export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return `"${file.name}" isn't a supported image. Upload a JPG, PNG, WebP or GIF.`
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `"${file.name}" is ${formatBytes(file.size)}. Images must be less than ${formatBytes(MAX_UPLOAD_BYTES)}.`
  }
  return null
}

/** Decodes the file locally for its size and an average color to use as the loading placeholder. */
export async function readImageInfo(file: Blob): Promise<ImageInfo> {
  const bitmap = await createImageBitmap(file)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 8
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    let dominantColor: string | null = null
    if (ctx) {
      ctx.drawImage(bitmap, 0, 0, 8, 8)
      const { data } = ctx.getImageData(0, 0, 8, 8)
      const sum = [0, 0, 0]
      for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c++) sum[c] += data[i + c]
      dominantColor = `#${sum.map((s) => Math.round(s / 64).toString(16).padStart(2, '0')).join('')}`
    }
    return { width: bitmap.width, height: bitmap.height, dominantColor }
  } finally {
    bitmap.close()
  }
}

/** Loads a remote image just to measure it (for "Save from URL" pins). */
export function measureRemoteImage(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error("We couldn't load an image from that URL."))
    img.src = url
  })
}

/**
 * Uploads a pin image as multipart/form-data. Uses XHR rather than fetch because fetch
 * cannot report upload progress.
 */
export function uploadPinImage(
  file: File,
  token: string | null,
  { onProgress, signal }: { onProgress?: (fraction: number) => void; signal?: AbortSignal } = {},
): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API}/uploads/pins`)
    xhr.withCredentials = true
    xhr.responseType = 'json'
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total)
    }
    xhr.onload = () => {
      const body = xhr.response as { upload?: UploadedImage; message?: string } | null
      if (xhr.status >= 200 && xhr.status < 300 && body?.upload) return resolve(body.upload)
      reject(new Error(body?.message ?? `Upload failed (${xhr.status}). Please try again.`))
    }
    xhr.onerror = () => reject(new Error('Upload failed. Check your connection and try again.'))
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'))
    signal?.addEventListener('abort', () => xhr.abort(), { once: true })
    const body = new FormData()
    body.append('image', file)
    xhr.send(body)
  })
}
