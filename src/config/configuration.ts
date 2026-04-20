export default () => ({
  app: {
    name: process.env.APP_NAME || 'Noble Lemat Delivery And Marketplace API',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '4000', 10),
  },

  database: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false',
  },

  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL ?? '60', 10),
    limit: parseInt(process.env.RATE_LIMIT_LIMIT ?? '100', 10),
  },

  booking: {
    seatReservationMinutes: parseInt(process.env.SEAT_RESERVATION_MINUTES ?? '10', 10),
    seatSweepIntervalMs: parseInt(process.env.SEAT_SWEEP_INTERVAL_MS ?? '60000', 10),
  },
});
