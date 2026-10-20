/**
 * Identifies an image by its magic bytes and reads its pixel size from the header, without
 * decoding pixels or pulling in native dependencies. The declared mimetype and file name of an
 * upload are never trusted: anything that is not a well-formed JPEG, PNG, WebP or GIF header
 * (SVG, HTML, renamed text files...) is rejected.
 */

export type ImageType = 'jpeg' | 'png' | 'webp' | 'gif'

export type ImageMeta = {
  type: ImageType
  mimeType: string
  ext: string
  /** Display size, i.e. already swapped for JPEGs whose EXIF orientation rotates them 90°. */
  width: number
  height: number
}

const FORMATS: Record<ImageType, { mimeType: string; ext: string }> = {
  jpeg: { mimeType: 'image/jpeg', ext: 'jpg' },
  png: { mimeType: 'image/png', ext: 'png' },
  webp: { mimeType: 'image/webp', ext: 'webp' },
  gif: { mimeType: 'image/gif', ext: 'gif' },
}

export const ALLOWED_IMAGE_MIME_TYPES = Object.values(FORMATS).map((f) => f.mimeType)

/** Returns null when the buffer is not a supported image or its header is malformed. */
export function readImageMeta(buf: Buffer): ImageMeta | null {
  const parsed = readPng(buf) ?? readGif(buf) ?? readWebp(buf) ?? readJpeg(buf)
  if (!parsed || parsed.width < 1 || parsed.height < 1) return null
  return { ...parsed, ...FORMATS[parsed.type] }
}

type Parsed = { type: ImageType; width: number; height: number }

function readPng(buf: Buffer): Parsed | null {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (buf.length < 24 || !buf.subarray(0, 8).equals(signature)) return null
  if (buf.toString('latin1', 12, 16) !== 'IHDR') return null
  return { type: 'png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

function readGif(buf: Buffer): Parsed | null {
  if (buf.length < 10) return null
  const signature = buf.toString('latin1', 0, 6)
  if (signature !== 'GIF87a' && signature !== 'GIF89a') return null
  return { type: 'gif', width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) }
}

function readWebp(buf: Buffer): Parsed | null {
  if (buf.length < 30) return null
  if (buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WEBP') return null
  const chunk = buf.toString('latin1', 12, 16)
  if (chunk === 'VP8 ') {
    // Lossy: key frame start code, then 14-bit dimensions.
    if (buf[23] !== 0x9d || buf[24] !== 0x01 || buf[25] !== 0x2a) return null
    return { type: 'webp', width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff }
  }
  if (chunk === 'VP8L') {
    // Lossless: signature byte, then 14-bit (width - 1) and (height - 1) packed little-endian.
    if (buf[20] !== 0x2f) return null
    const bits = buf.readUInt32LE(21)
    return { type: 'webp', width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
  }
  if (chunk === 'VP8X') {
    // Extended: 24-bit (width - 1) and (height - 1).
    return { type: 'webp', width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 }
  }
  return null
}

/** Start-of-frame markers carry the frame size (C4, C8 and CC are other segment types). */
const SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf])

function readJpeg(buf: Buffer): Parsed | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) return null
  let orientation = 1
  let i = 2
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff) return null
    const marker = buf[i + 1]
    // Fill bytes, then markers without a length field.
    if (marker === 0xff) {
      i += 1
      continue
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      i += 2
      continue
    }
    if (marker === 0xd9 || marker === 0xda) return null // End of image / scan data before any frame header.
    const length = buf.readUInt16BE(i + 2)
    if (length < 2 || i + 2 + length > buf.length) return null
    if (marker === 0xe1) orientation = readExifOrientation(buf.subarray(i + 4, i + 2 + length)) ?? orientation
    if (SOF_MARKERS.has(marker)) {
      if (length < 7) return null
      const height = buf.readUInt16BE(i + 5)
      const width = buf.readUInt16BE(i + 7)
      // Orientations 5-8 rotate by 90°, and browsers apply EXIF orientation when displaying.
      return orientation >= 5 && orientation <= 8 ? { type: 'jpeg', width: height, height: width } : { type: 'jpeg', width, height }
    }
    i += 2 + length
  }
  return null
}

/** Reads the Orientation tag (0x0112) from IFD0 of an APP1 "Exif" segment payload. */
function readExifOrientation(seg: Buffer): number | null {
  if (seg.length < 14 || seg.toString('latin1', 0, 6) !== 'Exif\0\0') return null
  const tiff = seg.subarray(6)
  const order = tiff.toString('latin1', 0, 2)
  if (order !== 'II' && order !== 'MM') return null
  const le = order === 'II'
  const u16 = (o: number) => (le ? tiff.readUInt16LE(o) : tiff.readUInt16BE(o))
  const u32 = (o: number) => (le ? tiff.readUInt32LE(o) : tiff.readUInt32BE(o))
  const ifd = u32(4)
  if (ifd + 2 > tiff.length) return null
  const count = u16(ifd)
  for (let n = 0; n < count; n++) {
    const entry = ifd + 2 + n * 12
    if (entry + 12 > tiff.length) return null
    if (u16(entry) === 0x0112) return u16(entry + 8)
  }
  return null
}
