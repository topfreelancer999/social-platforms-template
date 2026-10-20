import { randomBytes } from 'crypto'
import { mkdir, rm, unlink, writeFile } from 'fs/promises'
import path from 'path'
import { config } from '../config.js'

/** Public URL prefix the uploads dir is served under (proxied by Vite in dev, like /api). */
export const UPLOADS_URL_PREFIX = '/uploads'

/**
 * Builds a fresh storage key such as `pins/2026/10/3f9c...e1.jpg`. Keys are entirely
 * server-generated (date folders + 128 random bits + the extension of the sniffed type),
 * so no user-supplied name ever reaches the filesystem.
 */
export function newStorageKey(ext: string, now = new Date()): string {
  const yyyy = String(now.getUTCFullYear())
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `pins/${yyyy}/${mm}/${randomBytes(16).toString('hex')}.${ext}`
}

const KEY_PATTERN = /^pins\/\d{4}\/\d{2}\/[0-9a-f]{32}\.(jpg|png|webp|gif)$/

/** Resolves a storage key to an absolute path, refusing anything that is not a key we generated. */
export function storagePath(key: string): string {
  if (!KEY_PATTERN.test(key)) throw new Error(`Invalid storage key: ${key}`)
  const full = path.resolve(config.uploadsDir, key)
  if (!full.startsWith(config.uploadsDir + path.sep)) throw new Error(`Invalid storage key: ${key}`)
  return full
}

export function publicUrl(key: string): string {
  return `${UPLOADS_URL_PREFIX}/${key}`
}

export async function saveFile(key: string, data: Buffer): Promise<void> {
  const full = storagePath(key)
  await mkdir(path.dirname(full), { recursive: true })
  // `wx` never overwrites an existing file.
  await writeFile(full, data, { flag: 'wx' })
}

/** Deletes a stored file; a file that is already gone is not an error. */
export async function deleteFile(key: string): Promise<void> {
  try {
    await unlink(storagePath(key))
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') console.error('Failed to delete upload', key, err)
  }
}

/** Removes every stored pin image. Only used by the seed, which also wipes the pin tables. */
export async function clearPinFiles(): Promise<void> {
  await rm(path.join(config.uploadsDir, 'pins'), { recursive: true, force: true })
}
