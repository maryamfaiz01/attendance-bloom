const rateLimit = require('express-rate-limit');

const IS_PROD = process.env.NODE_ENV === 'production';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: IS_PROD ? 5 : 50, // Strict 5 attempts in production, 50 in development
  standardHeaders: true,
  legacyHeaders: false,

  // Skip rate limiting for localhost in development environment
  skip: (req) => {
    if (IS_PROD) return false;
    const ip = req.ip || req.socket.remoteAddress || '';
    return (
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip === '::ffff:127.0.0.1' ||
      ip === 'localhost'
    );
  },

  // Custom handler logging blocked attempts with IP
  handler: (req, res, next, options) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'Unknown IP';
    console.warn(
      `\n⚠️ [RateLimit Warning] Login rate limit triggered!` +
      `\n   IP: ${clientIp}` +
      `\n   Environment: ${process.env.NODE_ENV || 'development'}` +
      `\n   Max Allowed Attempts: ${options.max} per ${options.windowMs / 60000} minutes.\n`
    );
    res.status(options.statusCode).json(options.message);
  },

  message: {
    error: 'Too many failed login attempts from this IP. Please try again after 15 minutes.'
  }
});

module.exports = {
  loginLimiter
};
