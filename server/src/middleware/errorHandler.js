const logger = require('../config/logger');
const env = require('../config/env');

function notFound(req, res, next) {
    res.status(404).json({ error: 'Not found', path: req.originalUrl });
}

// Centralized error handler. Always emits a JSON response and logs
// the underlying cause. In production, we never echo raw error.message
// to the client because it can leak stack traces or DB internals.
function errorHandler(err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }
    const status = err.status || err.statusCode || 500;
    const safeMessage = status >= 500 && env.IS_PROD ? 'Internal server error' : err.message;
    logger.error('unhandled', {
        id: req.id,
        status,
        message: err.message,
        stack: env.IS_PROD ? undefined : err.stack,
    });
    res.status(status).json({ error: safeMessage });
}

module.exports = { notFound, errorHandler };
