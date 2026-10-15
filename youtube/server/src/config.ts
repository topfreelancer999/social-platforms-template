import 'dotenv/config'

export const config = {
  port: Number(process.env.PORT ?? 3005),
  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: process.env.REDIS_URL?.trim() || '',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-min-32-characters!!',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-min-32-characters!!',
  accessExpires: '15m',
  refreshExpires: '7d',
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5177',
}
