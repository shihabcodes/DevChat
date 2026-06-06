import { io } from 'socket.io-client';

let socket = null;

function backendUrl() {
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, '');
    }
    return 'http://localhost:5001';
}

export const getSocket = () => {
    if (socket) return socket;
    const token = typeof window !== 'undefined' ? localStorage.getItem('devchat_token') : null;
    if (!token) return null;
    socket = io(backendUrl(), {
        auth: { token },
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        transports: ['websocket', 'polling'],
    });
    return socket;
};

export const connectSocket = () => {
    const s = getSocket();
    if (s && !s.connected) s.connect();
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
