const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');

const onlineUsers = new Map();

const setupSocketHandlers = (io) => {
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) return next(new Error('Authentication required'));

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId);
            if (!user) return next(new Error('User not found'));

            socket.user = user;
            next();
        } catch (error) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.user.displayName} (${socket.id})`);

        socket.on('joinWorkspace', async (workspaceId) => {
            socket.join(`workspace:${workspaceId}`);
            onlineUsers.set(socket.id, {
                userId: socket.user._id.toString(),
                displayName: socket.user.displayName,
                avatar: socket.user.avatar,
                workspaceId,
            });

            await User.findByIdAndUpdate(socket.user._id, { status: 'online' });

            const workspaceUsers = Array.from(onlineUsers.values())
                .filter(u => u.workspaceId === workspaceId);
            io.to(`workspace:${workspaceId}`).emit('onlineUsers', workspaceUsers);
        });

        socket.on('joinChannel', (channelId) => {
            socket.join(`channel:${channelId}`);
        });

        socket.on('leaveChannel', (channelId) => {
            socket.leave(`channel:${channelId}`);
        });

        socket.on('sendMessage', async (data) => {
            try {
                const { content, type, language, channelId } = data;

                const message = new Message({
                    content,
                    type: type || 'text',
                    language: language || '',
                    channel: channelId,
                    user: socket.user._id,
                });
                await message.save();

                const populated = await Message.findById(message._id)
                    .populate('user', 'displayName email avatar');

                io.to(`channel:${channelId}`).emit('newMessage', populated);
            } catch (error) {
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        socket.on('typing', (channelId) => {
            socket.to(`channel:${channelId}`).emit('userTyping', {
                userId: socket.user._id,
                displayName: socket.user.displayName,
            });
        });

        socket.on('stopTyping', (channelId) => {
            socket.to(`channel:${channelId}`).emit('userStopTyping', {
                userId: socket.user._id,
            });
        });

        socket.on('disconnect', async () => {
            console.log(`User disconnected: ${socket.user.displayName} (${socket.id})`);

            const userData = onlineUsers.get(socket.id);
            onlineUsers.delete(socket.id);

            await User.findByIdAndUpdate(socket.user._id, { status: 'offline' });

            if (userData) {
                const workspaceUsers = Array.from(onlineUsers.values())
                    .filter(u => u.workspaceId === userData.workspaceId);
                io.to(`workspace:${userData.workspaceId}`).emit('onlineUsers', workspaceUsers);
            }
        });
    });
};

module.exports = setupSocketHandlers;
