const rateLimit = require('express-rate-limit');

// Per-user (when authenticated) or per-IP (when not) rate limiters.
// Reasonable defaults for a public launch. Tighten on the AI endpoint
// in particular since each call costs real money for the user.

const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please slow down.' },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { error: 'Too many attempts. Try again in a few minutes.' },
});

const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => (req.user ? req.user._id.toString() : req.ip),
    message: { error: 'AI rate limit reached. Try again in an hour.' },
});

module.exports = { globalLimiter, authLimiter, aiLimiter };
