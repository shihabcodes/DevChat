const rateLimit = require('express-rate-limit');

const getClientIp = (req) =>
    req.headers['cf-connecting-ip'] ||
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.ip;

const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getClientIp,
    message: { error: 'Too many requests, please slow down.' },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getClientIp,
    skipSuccessfulRequests: true,
    message: { error: 'Too many attempts. Try again in a few minutes.' },
});

const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => (req.user ? req.user._id.toString() : getClientIp(req)),
    message: { error: 'AI rate limit reached. Try again in an hour.' },
});

module.exports = { globalLimiter, authLimiter, aiLimiter };
