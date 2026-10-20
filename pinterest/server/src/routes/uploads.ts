import { Router, type NextFunction, type Request, type Response } from 'express'
import multer from 'multer'
import rateLimit from 'express-rate-limit'
import { config } from '../config.js'
import { prisma } from '../lib/prisma.js'
import { param } from '../lib/params.js'
import { ALLOWED_IMAGE_MIME_TYPES, readImageMeta } from '../lib/imageMeta.js'
import { deleteFile, newStorageKey, saveFile } from '../lib/storage.js'
import { toUploadDto } from '../services/uploads.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'

/** Browsers cap canvas/image sizes around here; anything bigger is not a realistic pin. */
const MAX_DIMENSION = 16384
const maxMb = Math.round(config.maxUploadBytes / (1024 * 1024))
const TOO_LARGE = `Image is too large. Upload a file under ${maxMb} MB.`
const UNSUPPORTED = 'Unsupported file type. Upload a JPG, PNG, WebP or GIF image.'

class UploadError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

// Files are buffered in memory (bounded by fileSize) so nothing touches disk before the
// magic-byte check passes.
const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes, files: 1, fields: 0, parts: 1 },
  fileFilter: (_req, file, cb) => {
    // Cheap early rejection of obviously wrong types (SVG, HTML...). The bytes are still sniffed below.
    if (ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype) || file.mimetype === 'application/octet-stream') cb(null, true)
    else cb(new UploadError(415, UNSUPPORTED))
  },
})

function parseImage(req: Request, res: Response, next: NextFunction) {
  // Refuse obviously oversized bodies before reading them (small allowance for multipart framing).
  if (Number(req.headers['content-length'] ?? 0) > config.maxUploadBytes + 64 * 1024) {
    return res.status(413).json({ message: TOO_LARGE })
  }
  parser.single('image')(req, res, (err: unknown) => {
    if (!err) return next()
    if (err instanceof UploadError) return res.status(err.status).json({ message: err.message })
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: TOO_LARGE })
      return res.status(400).json({ message: 'Send exactly one image in the "image" field.' })
    }
    // Busboy parse errors (truncated or malformed multipart bodies).
    return res.status(400).json({ message: 'Malformed upload.' })
  })
}

export const uploadsRouter = Router()
uploadsRouter.use(requireAuth)

uploadsRouter.post(
  '/pins',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 60, message: { message: 'Too many uploads. Try again later.' } }),
  parseImage,
  async (req: AuthRequest, res) => {
    const file = req.file
    if (!file) return res.status(400).json({ message: 'Choose an image to upload.' })
    const meta = readImageMeta(file.buffer)
    if (!meta) return res.status(415).json({ message: UNSUPPORTED })
    if (meta.width > MAX_DIMENSION || meta.height > MAX_DIMENSION) {
      return res.status(422).json({ message: `Image dimensions must be at most ${MAX_DIMENSION}px per side.` })
    }

    const storageKey = newStorageKey(meta.ext)
    await saveFile(storageKey, file.buffer)
    try {
      const upload = await prisma.pinUpload.create({
        data: {
          userId: req.userId!,
          storageKey,
          mimeType: meta.mimeType,
          bytes: file.size,
          width: meta.width,
          height: meta.height,
        },
      })
      res.status(201).json({ upload: toUploadDto(upload) })
    } catch (err) {
      await deleteFile(storageKey)
      throw err
    }
  },
)

/** Discards an upload that has not been published yet (Remove / Replace on the Create Pin page). */
uploadsRouter.delete('/pins/:id', async (req: AuthRequest, res) => {
  const upload = await prisma.pinUpload.findUnique({
    where: { id: param(req, 'id') },
    include: { pin: { select: { id: true } } },
  })
  // Someone else's upload is reported as missing rather than forbidden.
  if (!upload || upload.userId !== req.userId) return res.status(404).json({ message: 'Upload not found' })
  if (upload.pin) return res.status(409).json({ message: 'This image belongs to a published pin. Delete the pin instead.' })
  await prisma.pinUpload.delete({ where: { id: upload.id } })
  await deleteFile(upload.storageKey)
  res.status(204).end()
})
