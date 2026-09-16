import rateLimit from 'express-rate-limit';

// Strict rate limiter for Login to prevent brute-force credential stuffing
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // max 50 login attempts
  skipSuccessfulRequests: true,
  skip: (req) => {
    // Never lock out local machine
    const ip = req.ip || req.connection?.remoteAddress || '';
    return ip.includes('127.0.0.1') || ip === '::1' || ip.includes('::ffff:127.0.0.1');
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Xavfsizlik tizimi: Kirish uchun juda ko‘p xato urinishlar amalga oshirildi. Iltimos, 15 daqiqadan so‘ng qayta urinib ko‘ring yoki Oila Boshlig‘i (Admin) bilan bog‘laning.',
  },
});

// General API rate limiter to protect against DoS/flooding
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Juda ko‘p so‘rov yuborildi. Iltimos, bir oz kuting.',
  },
});
