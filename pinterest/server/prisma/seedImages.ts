/**
 * Generates a few abstract poster-style PNGs for the seed, so demo profiles include pins whose
 * images live in local upload storage. Pure Node (zlib), no network access needed.
 */
import { deflateSync } from 'zlib'

type Rgb = [number, number, number]
type Painter = (x: number, y: number, w: number, h: number) => Rgb

export type SeedImage = { title: string; description: string; width: number; height: number; paint: Painter }

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const out = Buffer.alloc(body.length + 8)
  out.writeUInt32BE(data.length, 0)
  body.copy(out, 4)
  out.writeUInt32BE(crc32(body), body.length + 4)
  return out
}

/** Encodes an RGB PNG and returns it with its average color (used as the pin's placeholder). */
export function renderPng(image: SeedImage): { data: Buffer; dominantColor: string } {
  const { width: w, height: h, paint } = image
  const raw = Buffer.alloc((w * 3 + 1) * h)
  const sum = [0, 0, 0]
  for (let y = 0; y < h; y++) {
    const row = y * (w * 3 + 1) // Each row starts with filter type 0 (none).
    for (let x = 0; x < w; x++) {
      const px = paint(x, y, w, h)
      for (let c = 0; c < 3; c++) {
        const v = Math.max(0, Math.min(255, Math.round(px[c])))
        raw[row + 1 + x * 3 + c] = v
        sum[c] += v
      }
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // Bit depth
  ihdr[9] = 2 // Truecolor RGB
  const data = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
  const hex = sum.map((s) => Math.round(s / (w * h)).toString(16).padStart(2, '0')).join('')
  return { data, dominantColor: `#${hex}` }
}

const hex = (s: string): Rgb => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)]
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
/** Anti-aliased coverage of a shape edge at signed distance `d` (negative = inside). */
const cover = (d: number) => Math.max(0, Math.min(1, 0.5 - d))
const circle = (x: number, y: number, cx: number, cy: number, r: number) => Math.hypot(x - cx, y - cy) - r

export const SEED_IMAGES: SeedImage[] = [
  {
    title: 'Sunset gradient wallpaper',
    description: 'Warm dusk tones for a phone background · #wallpaper #sunset',
    width: 600,
    height: 900,
    paint: (x, y, w, h) => {
      let c = mix(hex('#2b1055'), hex('#ff7e5f'), Math.min(1, y / (h * 0.7)))
      c = mix(c, hex('#ffd29d'), cover(circle(x, y, w * 0.5, h * 0.58, w * 0.18)))
      const ridge1 = h * 0.66 + Math.sin(x / 70) * 22 + Math.sin(x / 23) * 6
      const ridge2 = h * 0.76 + Math.sin(x / 95 + 2) * 28
      c = mix(c, hex('#5b2a5e'), cover(ridge1 - y))
      return mix(c, hex('#2a1238'), cover(ridge2 - y))
    },
  },
  {
    title: 'Mid-century modern shapes print',
    description: 'Printable wall art in mustard, teal and rust · #midcentury #wallart',
    width: 600,
    height: 750,
    paint: (x, y, w, h) => {
      let c = hex('#f3e9d2')
      c = mix(c, hex('#e09f3e'), cover(Math.max(circle(x, y, w * 0.5, h * 0.42, w * 0.32), y - h * 0.42)))
      c = mix(c, hex('#2a7f7a'), cover(circle(x, y, w * 0.3, h * 0.66, w * 0.17)))
      c = mix(c, hex('#9e2a2b'), cover(circle(x, y, w * 0.68, h * 0.7, w * 0.11)))
      return mix(c, hex('#335c67'), cover(Math.abs(y - h * 0.86) - 4))
    },
  },
  {
    title: 'Soft pastel color palette',
    description: 'Five calm swatches for a nursery or bedroom · #palette #pastel',
    width: 600,
    height: 1000,
    paint: (_x, y, _w, h) => {
      const swatches = ['#f8d5d1', '#f6e7c1', '#cfe3d4', '#c9dbef', '#ddd0ec'].map(hex)
      return swatches[Math.min(swatches.length - 1, Math.floor((y / h) * swatches.length))]
    },
  },
  {
    title: 'Bauhaus grid poster',
    description: 'Quarter circles on a 3×4 grid · #bauhaus #design',
    width: 600,
    height: 800,
    paint: (x, y) => {
      const palette = ['#e63946', '#f1c453', '#1d3557', '#a8dadc', '#f1faee'].map(hex)
      const cell = 200
      const col = Math.floor(x / cell)
      const row = Math.floor(y / cell)
      const i = col + row * 3
      const corner = i % 4
      const cx = col * cell + (corner === 1 || corner === 2 ? cell : 0)
      const cy = row * cell + (corner >= 2 ? cell : 0)
      return mix(palette[(i + 2) % 5], palette[i % 5], cover(circle(x, y, cx, cy, cell)))
    },
  },
  {
    title: 'Ocean waves pattern',
    description: 'Seamless wave pattern for fabric or wrapping paper · #pattern',
    width: 600,
    height: 600,
    paint: (x, y) => {
      const t = (Math.sin((y + Math.sin(x / 30) * 14) / 16) + 1) / 2
      return mix(hex('#0b3c5d'), hex('#7fc8f8'), t * t)
    },
  },
  {
    title: 'Desert dunes at dusk',
    description: 'Minimal landscape print · #desert #minimal',
    width: 800,
    height: 600,
    paint: (x, y, _w, h) => {
      let c = mix(hex('#fbd3a9'), hex('#f08a5d'), y / h)
      c = mix(c, hex('#d9673f'), cover(h * 0.55 + Math.sin(x / 120) * 40 - y))
      return mix(c, hex('#a8432b'), cover(h * 0.75 + Math.sin(x / 90 + 1.5) * 30 - y))
    },
  },
]
