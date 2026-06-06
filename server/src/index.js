require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

const env = require('./config/env');
const logger = require('./config/logger');
const connectDB = require('./config/db');
const setupSocketHandlers = require('./socket/handlers');
const { globalLimiter } = require('./middleware/rateLimit');
const requestContext = require('./middleware/requestContext');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const workspaceRoutes = require('./routes/workspaces');
const channelRoutes = require('./routes/channels');
const messageRoutes = require('./routes/messages');
const aiRoutes = require('./routes/ai');
const keyRoutes = require('./routes/keys');
const demoRoutes = require('./routes/demo');

const app = express();
const server = http.createServer(app);

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({
    contentSecurityPolicy: env.IS_PROD ? undefined : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
    origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (env.ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
        return cb(new Error('CORS: origin not allowed'));
    },
    credentials: true,
}));
app.use(express.json({ limit: '64kb' }));
app.use(requestContext);
app.use(globalLimiter);

const io = new Server(server, {
    cors: {
        origin: env.ALLOWED_ORIGINS,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/keys', keyRoutes);
app.use('/api/demo', demoRoutes);

const PORT = env.PORT;

// Mongo connect state, exposed to the healthcheck.
let mongoState = 0; // 0=disconnected, 1=connected, 2=connecting
mongoose.connection.on('connected', () => {
    mongoState = 1;
    logger.info('mongo connected', { host: mongoose.connection.host });
});
mongoose.connection.on('disconnected', () => {
    mongoState = 0;
    logger.warn('mongo disconnected');
});
mongoose.connection.on('reconnected', () => {
    mongoState = 1;
    logger.info('mongo reconnected');
});

app.get('/api/health', (req, res) => {
    // Always 200 — the platform's healthcheck only needs to know the
    // process is alive and serving HTTP. The mongo field tells
    // operators the DB state.
    res.json({
        status: mongoState === 1 ? 'ok' : (mongoState === 2 ? 'starting' : 'degraded'),
        mongo: mongoState,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

app.use(notFound);
app.use(errorHandler);

setupSocketHandlers(io);

function start() {
    // Start the HTTP server FIRST so the platform healthcheck can
    // hit /api/health even if Mongo is slow to connect. The health
    // endpoint reports mongoState so the platform knows the actual
    // status without having to time out on a hung DB connection.
    return new Promise((resolve, reject) => {
        server.listen(PORT, '0.0.0.0', () => {
            logger.info(`DevChat server listening on :${PORT} (env=${env.NODE_ENV})`);
            resolve();
            // Kick off the Mongo connect in the background. If it
            // fails, the process keeps running so the healthcheck
            // still responds — the platform can see mongoState: 0
            // in the response and we log a clear error.
            mongoState = 2;
            connectDB().catch((err) => {
                mongoState = 0;
                logger.error('mongo connect failed (server still up)', { message: err.message });
            });
        });
        server.once('error', reject);
    });
}

// Graceful shutdown. Closes socket.io first (drains in-flight
// connections), then the HTTP server, then Mongo. Render/Railway
// send SIGTERM and wait ~30s before SIGKILL.
let shuttingDown = false;
async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`received ${signal}, starting graceful shutdown`);
    try {
        io.close();
        await new Promise((resolve) => server.close(resolve));
        await mongoose.disconnect();
        logger.info('shutdown complete');
        process.exit(0);
    } catch (err) {
        logger.error('shutdown error', { message: err.message });
        process.exit(1);
    }
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Centralized last-resort handlers. We DO NOT swallow errors here
// in production. The TTY/EIO workaround that lived in this file
// previously has been removed — it was a development-environment
// issue, not a production concern.
process.on('unhandledRejection', (reason) => {
    logger.error('unhandledRejection', {
        message: reason instanceof Error ? reason.message : String(reason),
    });
});
process.on('uncaughtException', (err) => {
    logger.error('uncaughtException', { message: err.message, stack: err.stack });
    // Process is in an undefined state; exit so the platform restarts us.
    process.exit(1);
});

if (require.main === module) {
    start().catch((err) => {
        logger.error('failed to start', { message: err.message });
        process.exit(1);
    });
}

module.exports = { app, server, io, start };
