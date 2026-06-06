// Structured logger with request id support. In dev, prints human-readable
// single-line output. In prod, prints one JSON object per line so a log
// pipeline (e.g. Logtail, BetterStack, Datadog) can ingest it directly.

const env = require('../config/env');

function emit(level, msg, meta = {}) {
    const record = {
        ts: new Date().toISOString(),
        level,
        msg,
        ...meta,
    };
    if (env.IS_PROD) {
        process.stdout.write(JSON.stringify(record) + '\n');
    } else {
        const tail = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
        process.stdout.write(`[${level}] ${msg}${tail}\n`);
    }
}

const logger = {
    info: (msg, meta) => emit('info', msg, meta),
    warn: (msg, meta) => emit('warn', msg, meta),
    error: (msg, meta) => emit('error', msg, meta),
    debug: (msg, meta) => {
        if (!env.IS_PROD) emit('debug', msg, meta);
    },
};

module.exports = logger;
