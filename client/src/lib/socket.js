import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
    if (socket) return socket;

    const token = typeof window !== 'undefined' ? localStorage.getItem('devchat_token') : null;
    if (!token) return null;

    const backendUrl = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '') : 'http://localhost:5001';

    socket = io(backendUrl, {
        auth: { token },
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
    });

    return socket;
};

export const connectSocket = () => {
    const s = getSocket();
    if (s && !s.connected) {
        s.connect();
    }
    return s;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

export const resetSocket = () => {
    disconnectSocket();
    return connectSocket();
};
