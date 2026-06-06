'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import MessageInput from '@/components/MessageInput';
import AISettings from '@/components/AISettings';
import ErrorBoundary from '@/components/ErrorBoundary';
import api from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';

const TEMP_ID = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
    const [connectionState, setConnectionState] = useState('connecting');
    const [loadingMessages, setLoadingMessages] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);
    const [showAISettings, setShowAISettings] = useState(false);
    const [hasKey, setHasKey] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pendingTimers = useRef(new Map());

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
                setHasKey(Boolean(data.hasOpenaiKey));
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
                if (chs.length > 0) setActiveChannel(chs[0]);
                setInitialLoading(false);
            } catch (err) {
                console.error('Failed to load workspace:', err);
                router.push('/');
            }
        };
        loadWorkspace();
    }, [currentUser, workspaceId, router]);

    // Socket lifecycle. Listens for connect/disconnect/reconnect and
    // surfaces a banner state so users know what's happening.
    useEffect(() => {
        if (!currentUser || !workspaceId) return;
        const s = connectSocket();
        if (!s) return;

        const onConnect = () => {
            setConnectionState('connected');
            s.emit('joinWorkspace', workspaceId);
        };
        const onDisconnect = () => setConnectionState('disconnected');
        const onReconnecting = () => setConnectionState('reconnecting');
        const onReconnect = () => {
            setConnectionState('connected');
            s.emit('joinWorkspace', workspaceId);
        };

        s.on('connect', onConnect);
        s.on('disconnect', onDisconnect);
        s.io.on('reconnect_attempt', onReconnecting);
        s.io.on('reconnect', onReconnect);

        s.on('onlineUsers', setOnlineUsers);
        s.on('newMessage', (msg) => {
            setMessages((prev) => {
                // Server echoes our own message with _tempId set; swap
                // the matching optimistic placeholder for the real
                // message so the user doesn't see a duplicate.
                if (msg._tempId) {
                    const idx = prev.findIndex((m) => m._id === msg._tempId);
                    if (idx >= 0) {
                        const next = prev.slice();
                        const { _tempId, ...clean } = msg;
                        next[idx] = clean;
                        return next;
                    }
                }
                // Dedupe (other clients may have already seen it).
                if (prev.find((m) => m._id === msg._id)) return prev;
                return [...prev, msg];
            });
            // Clear the matching failure timer.
            if (msg._tempId && pendingTimers.current.has(msg._tempId)) {
                clearTimeout(pendingTimers.current.get(msg._tempId));
                pendingTimers.current.delete(msg._tempId);
            }
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
        s.on('error', (err) => {
            if (err.code === 'FORBIDDEN') router.push('/');
        });
        s.connect();
        setSocket(s);

        return () => {
            s.off('connect', onConnect);
            s.off('disconnect', onDisconnect);
            s.io.off('reconnect_attempt', onReconnecting);
            s.io.off('reconnect', onReconnect);
            s.off('onlineUsers');
            s.off('newMessage');
            s.off('userTyping');
            s.off('userStopTyping');
            s.off('error');
            disconnectSocket();
        };
    }, [currentUser, workspaceId, router]);

    useEffect(() => {
        if (!activeChannel) return;
        setLoadingMessages(true);
        setMessages([]);

        // If we came in via the demo flow, the initial demo response
        // already shipped us the seeded messages. Use them directly to
        // skip a round trip and avoid the loading flash.
        if (typeof window !== 'undefined') {
            const cached = sessionStorage.getItem(`devchat_demo_messages_${activeChannel._id}`);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    setMessages(parsed);
                    setLoadingMessages(false);
                    if (socket) socket.emit('joinChannel', activeChannel._id);
                    return () => {
                        if (socket) socket.emit('leaveChannel', activeChannel._id);
                    };
                } catch {
                    sessionStorage.removeItem(`devchat_demo_messages_${activeChannel._id}`);
                }
            }
        }

        if (socket) socket.emit('joinChannel', activeChannel._id);
        api.getMessages(activeChannel._id)
            .then((data) => setMessages(data.messages))
            .catch(console.error)
            .finally(() => setLoadingMessages(false));
        return () => {
            if (socket) socket.emit('leaveChannel', activeChannel._id);
        };
    }, [activeChannel, socket]);

    const handleSendMessage = useCallback((content, type, language) => {
        if (!socket || !activeChannel) return;
        const tempId = TEMP_ID();

        // Optimistic insert. We mark it as _pending and _tempId so the
        // socket echo can replace it cleanly.
        const optimistic = {
            _id: tempId,
            _pending: true,
            content,
            type: type || 'text',
            language: language || '',
            channel: activeChannel._id,
            user: {
                _id: currentUser?._id,
                displayName: currentUser?.displayName,
                avatar: currentUser?.avatar,
            },
            createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimistic]);

        // After 6s without an echo, mark as failed.
        const timer = setTimeout(() => {
            setMessages((prev) => prev.map((m) =>
                m._id === tempId ? { ...m, _failed: true, _pending: false } : m
            ));
            pendingTimers.current.delete(tempId);
        }, 6000);
        pendingTimers.current.set(tempId, timer);

        socket.emit('sendMessage', {
            content,
            type,
            language: language || '',
            channelId: activeChannel._id,
            _tempId: tempId,
        });
    }, [socket, activeChannel, currentUser]);

    const handleRetry = useCallback((failedMsg) => {
        // Remove the failed message entirely; the retry creates a new
        // optimistic one, and when the server echoes the new message
        // we'll add it once. Keeping the old one would duplicate.
        setMessages((prev) => prev.filter((m) => m._id !== failedMsg._id));
        if (socket && activeChannel) {
            const tempId = TEMP_ID();
            const optimistic = {
                _id: tempId,
                _pending: true,
                content: failedMsg.content,
                type: failedMsg.type,
                language: failedMsg.language,
                channel: activeChannel._id,
                user: {
                    _id: currentUser?._id,
                    displayName: currentUser?.displayName,
                    avatar: currentUser?.avatar,
                },
                createdAt: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, optimistic]);
            const timer = setTimeout(() => {
                setMessages((prev) => prev.map((m) =>
                    m._id === tempId ? { ...m, _failed: true, _pending: false } : m
                ));
                pendingTimers.current.delete(tempId);
            }, 6000);
            pendingTimers.current.set(tempId, timer);
            socket.emit('sendMessage', {
                content: failedMsg.content,
                type: failedMsg.type,
                language: failedMsg.language,
                channelId: activeChannel._id,
                _tempId: tempId,
            });
        }
    }, [socket, activeChannel, currentUser]);

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
            setSidebarOpen(false);
        } catch (err) {
            console.error('Failed to create channel:', err);
        }
    }, [workspaceId]);

    const handleSelectChannel = useCallback((channel) => {
        setActiveChannel(channel);
        setSidebarOpen(false);
    }, []);

    const handleMissingKey = useCallback(() => {
        setShowAISettings(true);
    }, []);

    const handleLogout = useCallback(() => {
        api.clearToken();
        disconnectSocket();
        router.push('/');
    }, [router]);

    if (initialLoading) {
        return (
            <div className="flex h-screen bg-[#0F0F23]">
                <div className="w-[260px] border-r border-[#2D2D5E] py-5 px-4">
                    <div className="skeleton h-6 w-[70%] mb-6" />
                    <div className="skeleton h-3.5 w-[40%] mb-3" />
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="skeleton h-3.5 mb-2.5 ml-2" style={{ width: `${50 + i * 10}%` }} />
                    ))}
                </div>
                <div className="flex-1" />
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <div className="flex h-screen bg-[#0F0F23] overflow-hidden">
                {connectionState !== 'connected' && (
                    <div className={`fixed top-0 left-0 right-0 z-40 px-4 py-2 text-center text-[0.8rem] font-medium text-white
                        ${connectionState === 'disconnected' ? 'bg-[#DC2626]' : 'bg-[#F59E0B]'}`}>
                        {connectionState === 'connecting' && 'Connecting…'}
                        {connectionState === 'reconnecting' && 'Reconnecting… your messages will be sent when you’re back online.'}
                        {connectionState === 'disconnected' && 'Disconnected. Trying to reconnect…'}
                    </div>
                )}

                {/* Mobile backdrop */}
                {sidebarOpen && (
                    <button
                        type="button"
                        aria-label="Close sidebar"
                        onClick={() => setSidebarOpen(false)}
                        className="md:hidden fixed inset-0 z-30 bg-black/60 cursor-default"
                    />
                )}

                <div className={`fixed md:static z-40 h-full transition-transform duration-200
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                    <Sidebar
                        workspace={workspace}
                        channels={channels}
                        activeChannel={activeChannel}
                        onSelectChannel={handleSelectChannel}
                        onCreateChannel={handleCreateChannel}
                        onlineUsers={onlineUsers}
                        currentUser={currentUser}
                        onLogout={handleLogout}
                        onOpenAISettings={() => setShowAISettings(true)}
                        hasOpenaiKey={hasKey}
                    />
                </div>

                <div className="flex-1 flex flex-col min-w-0">
                    {/* Mobile header */}
                    <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-[#2D2D5E] bg-[rgba(15,15,35,0.8)] backdrop-blur-md">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-1.5 rounded text-[#9CA3AF] hover:text-white"
                            aria-label="Open sidebar"
                        >
                            ☰
                        </button>
                        <span className="text-[#6B7280] text-base">#</span>
                        <span className="text-sm font-bold text-[#F9FAFB] truncate">
                            {activeChannel?.name || 'general'}
                        </span>
                    </div>

                    <ChatArea
                        messages={messages}
                        channel={activeChannel}
                        currentUser={currentUser}
                        typingUsers={typingUsers}
                        onExplain={undefined}
                        onMissingKey={handleMissingKey}
                        onRetry={handleRetry}
                        loading={loadingMessages}
                    />
                    <MessageInput
                        onSend={handleSendMessage}
                        onTyping={handleTyping}
                        onStopTyping={handleStopTyping}
                        disabled={connectionState === 'disconnected'}
                    />
                </div>

                <AISettings
                    open={showAISettings}
                    onClose={() => setShowAISettings(false)}
                    onChange={(info) => setHasKey(Boolean(info?.hasKey))}
                />
            </div>
        </ErrorBoundary>
    );
}
