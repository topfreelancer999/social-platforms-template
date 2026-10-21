import type { Request, Response, NextFunction } from 'express'

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  // HttpError and body-parser errors (malformed JSON) carry a 4xx status meant for the client.
  const status = (err as { status?: number }).status
  if (status && status >= 400 && status < 500) {
    return res.status(status).json({ message: err.message })
  }
  console.error(err)
  res.status(500).json({ message: err.message || 'Internal server error' })
}
