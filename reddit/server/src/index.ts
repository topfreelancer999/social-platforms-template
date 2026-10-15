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

app.get('/health', (_req, res) => res.json({ status: 'ok' }))
app.use('/api', apiRouter)
app.use(errorHandler)

setupSocket(httpServer).then(() => {
  httpServer.listen(config.port, () => {
    console.log(`Reddit API http://localhost:${config.port}`)
  })
})
