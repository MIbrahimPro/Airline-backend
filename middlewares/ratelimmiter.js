const rateLimit = require('express-rate-limit');

// For login: allow 5 attempts per 15 minutes
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { message: 'Too many login attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    xForwardedFor: false,
    keyGenerator: req => req.socket.remoteAddress
});

// For forgot‑password: 1 request per IP per 24 hours
const forgotLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 1,
    message: { message: 'You can only reset your password once every 24 hours.' },
    standardHeaders: true,
    legacyHeaders: false,
    xForwardedFor: false,
    keyGenerator: req => req.socket.remoteAddress
});

module.exports = {
    loginLimiter,
    forgotLimiter
};
