import type { Request, Response, NextFunction } from 'express'

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  // express.json() rejects malformed bodies; that's the client's fault, not ours.
  if ((err as { type?: string }).type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON body' })
  }
  console.error(err)
  res.status(500).json({ message: err.message || 'Internal server error' })
}
