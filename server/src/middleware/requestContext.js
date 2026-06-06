const env = require('../config/env');
const logger = require('../config/logger');

// Attach a short request id and log the request + response. Pairs with
// the client-side `x-request-id` header to correlate logs with a
// specific user action.

const HEADER = 'x-request-id';

function requestContext(req, res, next) {
    const id = req.header(HEADER) || require('crypto').randomBytes(8).toString('hex');
    req.id = id;
    res.setHeader(HEADER, id);
    const start = Date.now();
    res.on('finish', () => {
        const ms = Date.now() - start;
        const meta = {
            id,
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            ms,
            ip: req.ip,
        };
        if (res.statusCode >= 500) {
            logger.error('request', meta);
        } else if (res.statusCode >= 400) {
            logger.warn('request', meta);
        } else if (!env.IS_PROD || req.originalUrl !== '/api/health') {
            logger.info('request', meta);
        }
    });
    next();
}

module.exports = requestContext;
