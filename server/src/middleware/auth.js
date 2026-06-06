const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');

// Verifies the JWT and attaches the user to req.user.
// Used as Express middleware. The Socket.io equivalent lives
// in socket/handlers.js.

async function authenticate(req, res, next) {
    try {
        const header = req.header('Authorization') || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : null;
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const decoded = jwt.verify(token, env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        if (user.expiresAt && user.expiresAt.getTime() < Date.now()) {
            return res.status(401).json({ error: 'Session expired' });
        }
        req.user = user;
        req.token = token;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
}

function signToken(user) {
    return jwt.sign({ userId: user._id.toString() }, env.JWT_SECRET, { expiresIn: '7d' });
}

module.exports = { authenticate, signToken };
