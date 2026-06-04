require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const setupSocketHandlers = require('./socket/handlers');

// Prevent Node.js from crashing due to background TTY EIO errors
process.on('uncaughtException', (err) => {
    if (err.code === 'EIO' && err.syscall === 'read') {
        console.warn('Ignored TTY read EIO error.');
        return;
    }
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

const authRoutes = require('./routes/auth');
const workspaceRoutes = require('./routes/workspaces');
const channelRoutes = require('./routes/channels');
const messageRoutes = require('./routes/messages');
const aiRoutes = require('./routes/ai');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
    },
});

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/ai', aiRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

setupSocketHandlers(io);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`
╔══════════════════════════════════════╗
║     DevChat Server Running 🚀       ║
║     Port: ${PORT}                      ║
║     MongoDB: Connected ✅            ║
╚══════════════════════════════════════╝
    `);
    });
}).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
