const rateLimit = require('express-rate-limit');

// Rate limiter for public search endpoints
const publicSearchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many search requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many search requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Stricter rate limiter for authenticated endpoints
const authenticatedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Higher limit for authenticated users
  message: {
    error: 'Too many requests from this account, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// IP-based blocking for suspicious activity
const suspiciousActivityLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // Very high limit to catch only extreme abuse
  message: {
    error: 'Suspicious activity detected from this IP.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Restrict credential guessing and password-reset abuse.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    error: 'Too many authentication attempts from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Keep password-reset requests stricter because they can trigger outbound email.
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too many password reset attempts from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  publicSearchLimiter,
  authenticatedLimiter,
  suspiciousActivityLimiter,
  authLimiter,
  passwordResetLimiter
};
