import type { PinUpload } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { deleteFile, publicUrl } from '../lib/storage.js'

/** How long an upload may sit unpublished (e.g. an abandoned Create Pin page) before it is removed. */
const ORPHAN_TTL_MS = 24 * 60 * 60 * 1000
const SWEEP_INTERVAL_MS = 60 * 60 * 1000

export function toUploadDto(upload: PinUpload) {
  return {
    id: upload.id,
    url: publicUrl(upload.storageKey),
    width: upload.width,
    height: upload.height,
    mimeType: upload.mimeType,
    bytes: upload.bytes,
  }
}

/** Deletes upload rows (and their files) that never got attached to a pin. */
export async function sweepOrphanUploads(now = Date.now()): Promise<number> {
  const stale = await prisma.pinUpload.findMany({
    where: { pin: { is: null }, createdAt: { lt: new Date(now - ORPHAN_TTL_MS) } },
    select: { id: true, storageKey: true },
  })
  let removed = 0
  for (const upload of stale) {
    // Re-check per row so an upload published in the meantime keeps its file.
    const { count } = await prisma.pinUpload.deleteMany({ where: { id: upload.id, pin: { is: null } } })
    if (!count) continue
    await deleteFile(upload.storageKey)
    removed++
  }
  return removed
}

export function startUploadSweeper() {
  const run = () =>
    sweepOrphanUploads()
      .then((n) => n && console.log(`Removed ${n} unpublished upload(s)`))
      .catch((err) => console.error('Upload sweep failed', err))
  void run()
  setInterval(run, SWEEP_INTERVAL_MS).unref()
}
