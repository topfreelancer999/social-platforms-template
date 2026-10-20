import { Router } from 'express'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { toPublicUser } from '../lib/user.js'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { param } from '../lib/params.js'
import { enrichPin } from '../services/pins.js'
import { deleteFile, publicUrl } from '../lib/storage.js'
import { zodMessage } from '../lib/validate.js'

export const pinsRouter = Router()
pinsRouter.use(requireAuth)

pinsRouter.get('/feed', async (req: AuthRequest, res) => {
  const userId = req.userId!
  const follows = await prisma.userFollow.findMany({ where: { followerId: userId }, select: { followingId: true } })
  const ids = [userId, ...follows.map((f) => f.followingId)]
  const pins = await prisma.pin.findMany({
    where: { authorId: { in: ids } },
    include: { author: true },
    orderBy: { createdAt: 'desc' },
    take: 60,
  })
  if (pins.length < 20) {
    const more = await prisma.pin.findMany({
      include: { author: true },
      orderBy: { createdAt: 'desc' },
      take: 40,
    })
    const seen = new Set(pins.map((p) => p.id))
    for (const p of more) {
      if (!seen.has(p.id)) pins.push(p)
    }
  }
  res.json({ pins: await Promise.all(pins.map((p) => enrichPin(p, userId))) })
})

pinsRouter.get('/explore', async (req: AuthRequest, res) => {
  const pins = await prisma.pin.findMany({
    include: { author: true },
    orderBy: { createdAt: 'desc' },
    take: 48,
  })
  res.json({ pins: await Promise.all(pins.map((p) => enrichPin(p, req.userId!))) })
})

const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .url('Enter a valid URL')
  .refine((u) => /^https?:\/\//i.test(u), 'Only http(s) links are allowed')

const createPinSchema = z
  .object({
    // Pinterest's limits: 100 characters for titles, 500 for descriptions.
    title: z.string().trim().min(1, 'Add a title').max(100, 'Title must be 100 characters or less'),
    description: z.string().trim().max(500, 'Description must be 500 characters or less').default(''),
    linkUrl: z.union([z.literal(''), httpUrl]).nullish(),
    boardId: z.string().min(1).max(64).nullish(),
    /** An image previously stored via POST /api/uploads/pins. */
    uploadId: z.string().min(1).max(64).optional(),
    /** Or a remote image ("Save from URL"); its size is measured by the client. */
    imageUrl: httpUrl.optional(),
    imageWidth: z.number().int().min(1).max(16384).optional(),
    imageHeight: z.number().int().min(1).max(16384).optional(),
    dominantColor: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i, 'Invalid color')
      .optional(),
  })
  .refine((d) => !d.uploadId !== !d.imageUrl, { message: 'Upload an image or enter an image URL', path: ['image'] })

pinsRouter.post('/', async (req: AuthRequest, res) => {
  const parsed = createPinSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: zodMessage(parsed.error) })
  const input = parsed.data
  const userId = req.userId!

  if (input.boardId) {
    const board = await prisma.board.findFirst({ where: { id: input.boardId, userId } })
    if (!board) return res.status(403).json({ message: 'Invalid board' })
  }

  let image: { imageUrl: string; imageWidth?: number; imageHeight?: number; uploadId?: string }
  if (input.uploadId) {
    const upload = await prisma.pinUpload.findUnique({
      where: { id: input.uploadId },
      include: { pin: { select: { id: true } } },
    })
    if (!upload || upload.userId !== userId) return res.status(404).json({ message: 'Upload not found. Try uploading the image again.' })
    if (upload.pin) return res.status(409).json({ message: 'This image is already used by another pin' })
    // Dimensions come from the stored file header, never from the client.
    image = { imageUrl: publicUrl(upload.storageKey), imageWidth: upload.width, imageHeight: upload.height, uploadId: upload.id }
  } else {
    image = { imageUrl: input.imageUrl!, imageWidth: input.imageWidth, imageHeight: input.imageHeight }
  }

  try {
    const pin = await prisma.pin.create({
      data: {
        authorId: userId,
        boardId: input.boardId ?? null,
        title: input.title,
        description: input.description,
        linkUrl: input.linkUrl || null,
        dominantColor: input.dominantColor?.toLowerCase() ?? null,
        ...image,
      },
      include: { author: true },
    })
    res.status(201).json({ pin: await enrichPin(pin, userId) })
  } catch (err) {
    // Two publishes racing for the same upload hit the unique uploadId constraint.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ message: 'This image is already used by another pin' })
    }
    throw err
  }
})

/** Owner-only. Uploaded images are removed from disk together with the pin. */
pinsRouter.delete('/:id', async (req: AuthRequest, res) => {
  const pin = await prisma.pin.findUnique({ where: { id: param(req, 'id') }, include: { upload: true } })
  if (!pin) return res.status(404).json({ message: 'Not found' })
  if (pin.authorId !== req.userId) return res.status(403).json({ message: 'You can only delete your own pins' })
  await prisma.$transaction([
    prisma.pin.delete({ where: { id: pin.id } }),
    ...(pin.upload ? [prisma.pinUpload.delete({ where: { id: pin.upload.id } })] : []),
  ])
  if (pin.upload) await deleteFile(pin.upload.storageKey)
  res.status(204).end()
})

pinsRouter.get('/:id', async (req: AuthRequest, res) => {
  const pin = await prisma.pin.findUnique({
    where: { id: param(req, 'id') },
    include: { author: true },
  })
  if (!pin) return res.status(404).json({ message: 'Not found' })
  const comments = await prisma.pinComment.findMany({
    where: { pinId: pin.id },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })
  res.json({
    pin: await enrichPin(pin, req.userId!),
    comments: comments.map((c) => ({ id: c.id, content: c.content, createdAt: c.createdAt, user: toPublicUser(c.user) })),
  })
})

pinsRouter.post('/:id/save', async (req: AuthRequest, res) => {
  const pinId = param(req, 'id')
  const { boardId } = req.body as { boardId: string }
  if (!boardId) return res.status(400).json({ message: 'boardId required' })
  const board = await prisma.board.findFirst({ where: { id: boardId, userId: req.userId! } })
  if (!board) return res.status(403).json({ message: 'Invalid board' })
  await prisma.pinSave.upsert({
    where: { userId_pinId_boardId: { userId: req.userId!, pinId, boardId } },
    create: { userId: req.userId!, pinId, boardId },
    update: {},
  })
  res.json({ saved: true })
})

pinsRouter.post('/:id/comments', async (req: AuthRequest, res) => {
  const { content } = req.body as { content: string }
  if (!content?.trim()) return res.status(400).json({ message: 'content required' })
  const comment = await prisma.pinComment.create({
    data: { pinId: param(req, 'id'), userId: req.userId!, content: content.trim() },
    include: { user: true },
  })
  res.status(201).json({ comment: { id: comment.id, content: comment.content, user: toPublicUser(comment.user) } })
})
