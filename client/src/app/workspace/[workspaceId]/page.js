'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import MessageInput from '@/components/MessageInput';
import api from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';

export default function WorkspacePage() {
    const router = useRouter();
    const params = useParams();
    const workspaceId = params.workspaceId;

    const [currentUser, setCurrentUser] = useState(null);
    const [workspace, setWorkspace] = useState(null);
    const [channels, setChannels] = useState([]);
    const [activeChannel, setActiveChannel] = useState(null);
    const [messages, setMessages] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [typingUsers, setTypingUsers] = useState([]);
    const [socket, setSocket] = useState(null);
    const [loadingMessages, setLoadingMessages] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('devchat_token');
        if (!token) {
            router.push('/');
            return;
        }
        api.token = token;

        api.getMe()
            .then((data) => {
                setCurrentUser(data.user);
            })
            .catch(() => {
                api.clearToken();
                router.push('/');
            });
    }, [router]);

    useEffect(() => {
        if (!currentUser || !workspaceId) return;

        const loadWorkspace = async () => {
            try {
                const ws = await api.getWorkspace(workspaceId);
                setWorkspace(ws);

                const chs = await api.getChannels(workspaceId);
                setChannels(chs);

                if (chs.length > 0) {
                    setActiveChannel(chs[0]);
                }
                setInitialLoading(false);
            } catch (err) {
                console.error('Failed to load workspace:', err);
                router.push('/');
            }
        };

        loadWorkspace();
    }, [currentUser, workspaceId, router]);

    useEffect(() => {
        if (!currentUser || !workspaceId) return;

        const s = connectSocket();
        if (!s) return;

        s.emit('joinWorkspace', workspaceId);

        s.on('onlineUsers', (users) => {
            setOnlineUsers(users);
        });

        s.on('newMessage', (message) => {
            setMessages((prev) => [...prev, message]);
        });

        s.on('userTyping', (data) => {
            setTypingUsers((prev) => {
                if (prev.find((u) => u.userId === data.userId)) return prev;
                return [...prev, data];
            });
        });

        s.on('userStopTyping', (data) => {
            setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
        });

        setSocket(s);

        return () => {
            disconnectSocket();
        };
    }, [currentUser, workspaceId]);

    useEffect(() => {
        if (!activeChannel) return;

        setLoadingMessages(true);
        setMessages([]);

        if (socket) {
            socket.emit('joinChannel', activeChannel._id);
        }

        api.getMessages(activeChannel._id)
            .then((data) => {
                setMessages(data.messages);
            })
            .catch(console.error)
            .finally(() => setLoadingMessages(false));

        return () => {
            if (socket) {
                socket.emit('leaveChannel', activeChannel._id);
            }
        };
    }, [activeChannel, socket]);

    const handleSendMessage = useCallback((content, type, language) => {
        if (!socket || !activeChannel) return;

        socket.emit('sendMessage', {
            content,
            type,
            language: language || '',
            channelId: activeChannel._id,
        });
    }, [socket, activeChannel]);

    const handleTyping = useCallback(() => {
        if (!socket || !activeChannel) return;
        socket.emit('typing', activeChannel._id);
    }, [socket, activeChannel]);

    const handleStopTyping = useCallback(() => {
        if (!socket || !activeChannel) return;
        socket.emit('stopTyping', activeChannel._id);
    }, [socket, activeChannel]);

    const handleCreateChannel = useCallback(async (name) => {
        try {
            const channel = await api.createChannel(workspaceId, name);
            setChannels((prev) => [...prev, channel]);
            setActiveChannel(channel);
        } catch (err) {
            console.error('Failed to create channel:', err);
        }
    }, [workspaceId]);

    const handleExplain = useCallback(async (messageId, code, language) => {
        return api.explainCode(messageId, code, language);
    }, []);

    const handleLogout = useCallback(() => {
        api.clearToken();
        disconnectSocket();
        router.push('/');
    }, [router]);

    if (initialLoading) {
        return (
            <div style={{
                display: 'flex',
                height: '100vh',
                background: '#0F0F23',
            }}>
                {/* Skeleton sidebar */}
                <div style={{ width: 260, borderRight: '1px solid #2D2D5E', padding: '1.25rem 1rem' }}>
                    <div className="skeleton" style={{ height: 24, width: '70%', marginBottom: 24 }} />
                    <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 12 }} />
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="skeleton" style={{ height: 14, width: `${50 + i * 10}%`, marginBottom: 10, marginLeft: 8 }} />
                    ))}
                </div>
                <div style={{ flex: 1 }} />
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            height: '100vh',
            background: '#0F0F23',
            overflow: 'hidden',
        }}>
            <Sidebar
                workspace={workspace}
                channels={channels}
                activeChannel={activeChannel}
                onSelectChannel={setActiveChannel}
                onCreateChannel={handleCreateChannel}
                onlineUsers={onlineUsers}
                currentUser={currentUser}
                onLogout={handleLogout}
            />

            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
            }}>
                <ChatArea
                    messages={messages}
                    channel={activeChannel}
                    currentUser={currentUser}
                    typingUsers={typingUsers}
                    onExplain={handleExplain}
                    loading={loadingMessages}
                />

                <MessageInput
                    onSend={handleSendMessage}
                    onTyping={handleTyping}
                    onStopTyping={handleStopTyping}
                />
            </div>
        </div>
    );
}
