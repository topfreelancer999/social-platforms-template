import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import { createServer } from 'http'
import { config } from './config.js'
import { apiRouter } from './routes/index.js'
import { errorHandler } from './middleware/error.js'
import { setupSocket } from './socket/index.js'
import { UPLOADS_URL_PREFIX } from './lib/storage.js'
import { startUploadSweeper } from './services/uploads.js'

const app = express()
const httpServer = createServer(app)

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  }),
)
app.use(express.json())
app.use(cookieParser())
app.use(
  '/api/auth/login',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }),
)
app.use(
  '/api/auth/register',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }),
)

// Uploaded pin images. File names are random and never reused, so they can be cached forever.
app.use(
  UPLOADS_URL_PREFIX,
  express.static(config.uploadsDir, {
    index: false,
    dotfiles: 'deny',
    redirect: false,
    immutable: true,
    maxAge: '365d',
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox")
    },
  }),
)
app.use(UPLOADS_URL_PREFIX, (_req, res) => res.status(404).json({ message: 'Not found' }))

app.get('/health', (_req, res) => res.json({ status: 'ok' }))
app.use('/api', apiRouter)
app.use(errorHandler)

startUploadSweeper()

setupSocket(httpServer).then(() => {
  httpServer.listen(config.port, () => {
    console.log(`Pinterest API http://localhost:${config.port}`)
  })
})
