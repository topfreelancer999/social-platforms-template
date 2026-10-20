import 'dotenv/config'
import path from 'path'
import { fileURLToPath } from 'url'

/** The server package root (works from both src/ under tsx and dist/ after build). */
const serverRoot = fileURLToPath(new URL('..', import.meta.url))

export const config = {
  port: Number(process.env.PORT ?? 3012),
  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: process.env.REDIS_URL?.trim() || '',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-min-32-characters!!',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-min-32-characters!!',
  accessExpires: '15m',
  refreshExpires: '7d',
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5184',
  /** Local directory for uploaded files, served at /uploads. Relative paths resolve from the server folder. */
  uploadsDir: path.resolve(serverRoot, process.env.UPLOADS_DIR?.trim() || 'uploads'),
  /** Pinterest accepts images up to 20 MB. */
  maxUploadBytes: Number(process.env.MAX_UPLOAD_MB ?? 20) * 1024 * 1024,
}
