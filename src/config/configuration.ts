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
    origin: (() => {
      const raw = (process.env.CORS_ORIGIN || '*').trim();
      if (raw === '*') return '*';
      const origins = raw.split(',').map((o) => o.trim()).filter(Boolean);
      return origins.length === 1 ? origins[0] : origins;
    })(),
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

  email: {
    useLocalTransport: process.env.EMAIL_USE_LOCAL_TRANSPORT === 'true',
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    smtpSecure: process.env.SMTP_SECURE === 'true',
    fromEmail: process.env.EMAIL_FROM,
    fromName:
      process.env.EMAIL_FROM_NAME || process.env.APP_NAME || 'Noble Lemat Delivery And Marketplace API',
    replyTo: process.env.EMAIL_REPLY_TO,
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    uploadFolder: process.env.CLOUDINARY_UPLOAD_FOLDER || 'menaharia',
  },

  payment: {
    chapa: {
      apiUrl: process.env.CHAPA_API_URL,
      publicKey: process.env.CHAPA_PUBLIC_KEY,
      secretKey: process.env.CHAPA_SECRET_KEY,
      encryptionKey: process.env.CHAPA_ENCRYPTION_KEY,
    },
  },
});
