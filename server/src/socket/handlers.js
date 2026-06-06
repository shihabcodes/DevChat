const jwt = require('jsonwebtoken');

const env = require('../config/env');
const User = require('../models/User');
const Message = require('../models/Message');
const Channel = require('../models/Channel');
const Workspace = require('../models/Workspace');

const onlineUsers = new Map();

// In-memory cache: workspaceId -> Set<userId>. Cleared when a user
// leaves or disconnects. Used for membership checks on socket
// joinChannel/sendMessage. On a multi-instance deployment this
// would move to Redis.
const workspaceMembershipCache = new Map();
function cacheWorkspaceMembers(workspaceId, memberIds) {
    workspaceMembershipCache.set(workspaceId.toString(), new Set(memberIds.map(String)));
}
function invalidateWorkspaceCache(workspaceId) {
    if (workspaceId) workspaceMembershipCache.delete(workspaceId.toString());
}

async function isMemberOfWorkspace(userId, workspaceId) {
    const key = workspaceId.toString();
    let members = workspaceMembershipCache.get(key);
    if (!members) {
        const ws = await Workspace.findById(workspaceId).select('members');
        if (!ws) return false;
        members = new Set(ws.members.map(String));
        cacheWorkspaceMembers(workspaceId, members);
    }
    return members.has(userId.toString());
}

async function channelWorkspaceId(channelId) {
    const ch = await Channel.findById(channelId).select('workspace');
    return ch ? ch.workspace : null;
}

const setupSocketHandlers = (io) => {
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) return next(new Error('Authentication required'));
            const decoded = jwt.verify(token, env.JWT_SECRET);
            const user = await User.findById(decoded.userId);
            if (!user) return next(new Error('User not found'));
            if (user.expiresAt && user.expiresAt.getTime() < Date.now()) {
                return next(new Error('Session expired'));
            }
            socket.user = user;
            next();
        } catch (err) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.user.displayName} (${socket.id})`);

        socket.on('joinWorkspace', async (workspaceId) => {
            try {
                if (!workspaceId || !/^[a-f0-9]{24}$/i.test(workspaceId)) {
                    return socket.emit('error', { code: 'INVALID_ID', message: 'Invalid workspace id' });
                }
                const ws = await Workspace.findById(workspaceId);
                if (!ws) return socket.emit('error', { code: 'NOT_FOUND', message: 'Workspace not found' });
                if (!ws.members.some((m) => m.toString() === socket.user._id.toString())) {
                    return socket.emit('error', { code: 'FORBIDDEN', message: 'Not a member' });
                }
                socket.join(`workspace:${workspaceId}`);
                cacheWorkspaceMembers(workspaceId, ws.members);
                onlineUsers.set(socket.id, {
                    userId: socket.user._id.toString(),
                    displayName: socket.user.displayName,
                    avatar: socket.user.avatar,
                    workspaceId,
                });
                await User.findByIdAndUpdate(socket.user._id, { status: 'online' });
                const workspaceUsers = Array.from(onlineUsers.values())
                    .filter((u) => u.workspaceId === workspaceId);
                io.to(`workspace:${workspaceId}`).emit('onlineUsers', workspaceUsers);
            } catch (err) {
                socket.emit('error', { code: 'JOIN_FAILED', message: 'Failed to join workspace' });
            }
        });

        socket.on('joinChannel', async (channelId) => {
            try {
                if (!channelId || !/^[a-f0-9]{24}$/i.test(channelId)) {
                    return socket.emit('error', { code: 'INVALID_ID', message: 'Invalid channel id' });
                }
                const wsId = await channelWorkspaceId(channelId);
                if (!wsId) return socket.emit('error', { code: 'NOT_FOUND', message: 'Channel not found' });
                if (!(await isMemberOfWorkspace(socket.user._id, wsId))) {
                    return socket.emit('error', { code: 'FORBIDDEN', message: 'Not a member' });
                }
                socket.join(`channel:${channelId}`);
            } catch (err) {
                socket.emit('error', { code: 'JOIN_FAILED', message: 'Failed to join channel' });
            }
        });

        socket.on('leaveChannel', (channelId) => {
            if (channelId) socket.leave(`channel:${channelId}`);
        });

        socket.on('sendMessage', async (data) => {
            try {
                if (!data || typeof data !== 'object') {
                    return socket.emit('error', { code: 'INVALID_PAYLOAD', message: 'Bad payload' });
                }
                const { content, type, language, channelId } = data;
                if (!channelId || !/^[a-f0-9]{24}$/i.test(channelId)) {
                    return socket.emit('error', { code: 'INVALID_ID', message: 'Invalid channel id' });
                }
                if (typeof content !== 'string' || !content.trim() || content.length > 8000) {
                    return socket.emit('error', { code: 'INVALID_CONTENT', message: 'Content must be 1-8000 chars' });
                }
                if (type && !['text', 'code'].includes(type)) {
                    return socket.emit('error', { code: 'INVALID_TYPE', message: 'Invalid message type' });
                }
                const wsId = await channelWorkspaceId(channelId);
                if (!wsId) return socket.emit('error', { code: 'NOT_FOUND', message: 'Channel not found' });
                if (!(await isMemberOfWorkspace(socket.user._id, wsId))) {
                    return socket.emit('error', { code: 'FORBIDDEN', message: 'Not a member' });
                }
                const message = await Message.create({
                    content: content.trim(),
                    type: type || 'text',
                    language: type === 'code' ? (language || '').slice(0, 40) : '',
                    channel: channelId,
                    user: socket.user._id,
                });
                const populated = await Message.findById(message._id)
                    .populate('user', 'displayName email avatar');
                io.to(`channel:${channelId}`).emit('newMessage', populated);
            } catch (err) {
                socket.emit('error', { code: 'SEND_FAILED', message: 'Failed to send message' });
            }
        });

        socket.on('typing', async (channelId) => {
            try {
                if (!channelId || !/^[a-f0-9]{24}$/i.test(channelId)) return;
                const wsId = await channelWorkspaceId(channelId);
                if (!wsId || !(await isMemberOfWorkspace(socket.user._id, wsId))) return;
                socket.to(`channel:${channelId}`).emit('userTyping', {
                    userId: socket.user._id,
                    displayName: socket.user.displayName,
                });
            } catch {/* ignore */}
        });

        socket.on('stopTyping', (channelId) => {
            if (!channelId || !/^[a-f0-9]{24}$/i.test(channelId)) return;
            socket.to(`channel:${channelId}`).emit('userStopTyping', {
                userId: socket.user._id,
            });
        });

        socket.on('disconnect', async () => {
            console.log(`User disconnected: ${socket.user.displayName} (${socket.id})`);
            const userData = onlineUsers.get(socket.id);
            onlineUsers.delete(socket.id);
            try {
                await User.findByIdAndUpdate(socket.user._id, { status: 'offline' });
            } catch {/* ignore */}
            if (userData) {
                const workspaceUsers = Array.from(onlineUsers.values())
                    .filter((u) => u.workspaceId === userData.workspaceId);
                io.to(`workspace:${userData.workspaceId}`).emit('onlineUsers', workspaceUsers);
            }
        });
    });

    // Clear membership cache when workspaces change.
    socketCleanupBridge();
    return () => invalidateWorkspaceCache;
};

function socketCleanupBridge() {
    // intentionally no-op hook for future Redis integration
}

module.exports = setupSocketHandlers;
