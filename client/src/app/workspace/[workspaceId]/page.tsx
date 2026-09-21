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
import { User, Workspace, Channel, Message, OnlineUser, TypingUser } from '@/types';
import type { Socket } from 'socket.io-client';

const TEMP_ID = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Fallback seed data for instant client-side demo mode
const DEMO_CHANNELS: Channel[] = [
    { _id: 'ch-general', name: 'general' },
    { _id: 'ch-ai-codegen', name: 'ai-codegen' },
    { _id: 'ch-architecture', name: 'architecture' },
];

const DEMO_SEED_MESSAGES: Record<string, Message[]> = {
    'ch-general': [
        {
            _id: 'msg-seed-1',
            content: 'Welcome to the DevChat engineering workspace! Here is our high-performance cache invalidator in TypeScript:',
            type: 'text',
            channel: 'ch-general',
            user: { _id: 'u-alex', displayName: 'Alex (Staff Eng)' },
            createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
            _id: 'msg-seed-2',
            content: `export async function invalidateCacheKey(key: string, ttlSeconds: number = 300): Promise<boolean> {\n  const pipeline = redis.pipeline();\n  pipeline.del(key);\n  pipeline.publish('cache:invalidations', JSON.stringify({ key, timestamp: Date.now() }));\n  const results = await pipeline.exec();\n  return results ? results.every(([err]) => !err) : false;\n}`,
            type: 'code',
            language: 'typescript',
            channel: 'ch-general',
            user: { _id: 'u-alex', displayName: 'Alex (Staff Eng)' },
            aiExplanation: 'This TypeScript function executes an atomic Redis pipeline to delete a cached key and publish an invalidation event across the cluster.\n\nKey details:\n1. Atomic pipeline prevents race conditions during multi-instance invalidation.\n2. Invalidation event notifies connected WebSocket servers to drop L1 local memory caches.\n3. Error handling verifies that all pipeline operations executed without failure.',
            createdAt: new Date(Date.now() - 3500000).toISOString(),
        },
        {
            _id: 'msg-seed-3',
            content: 'Click "Explain Code" on the snippet above to see the streaming AI breakdown in action, or send your own code snippet below!',
            type: 'text',
            channel: 'ch-general',
            user: { _id: 'u-sarah', displayName: 'Sarah (Founding Eng)' },
            createdAt: new Date(Date.now() - 1800000).toISOString(),
        }
    ],
    'ch-ai-codegen': [
        {
            _id: 'msg-seed-4',
            content: 'Here is the streaming SSE proxy handler for our LLM completions in Node.js:',
            type: 'text',
            channel: 'ch-ai-codegen',
            user: { _id: 'u-shihab', displayName: 'Shihab (AI Lead)' },
            createdAt: new Date(Date.now() - 1200000).toISOString(),
        },
        {
            _id: 'msg-seed-5',
            content: `app.post('/api/ai/stream', async (req, res) => {\n  res.setHeader('Content-Type', 'text/event-stream');\n  res.setHeader('Cache-Control', 'no-cache');\n  res.setHeader('Connection', 'keep-alive');\n\n  const stream = await openai.chat.completions.create({\n    model: 'gpt-4o-mini',\n    messages: req.body.messages,\n    stream: true,\n  });\n\n  for await (const chunk of stream) {\n    const delta = chunk.choices[0]?.delta?.content || '';\n    if (delta) res.write(\`data: \${JSON.stringify({ delta })}\\n\\n\`);\n  }\n  res.write('data: [DONE]\\n\\n');\n  res.end();\n});`,
            type: 'code',
            language: 'javascript',
            channel: 'ch-ai-codegen',
            user: { _id: 'u-shihab', displayName: 'Shihab (AI Lead)' },
            aiExplanation: 'This endpoint streams Server-Sent Events (SSE) from OpenAI GPT-4o-mini directly to the client.\n\nKey highlights:\n1. Low memory footprint via asynchronous iteration over the OpenAI stream.\n2. Keep-alive connection with chunked transfer encoding avoids timeout on long generations.\n3. Standard [DONE] terminator signal for client stream completion.',
            createdAt: new Date(Date.now() - 900000).toISOString(),
        }
    ],
    'ch-architecture': [
        {
            _id: 'msg-seed-6',
            content: 'Our WebSocket architecture handles 50,000 concurrent socket connections per cluster with Redis pub/sub backplanes.',
            type: 'text',
            channel: 'ch-architecture',
            user: { _id: 'u-alex', displayName: 'Alex (Staff Eng)' },
            createdAt: new Date(Date.now() - 600000).toISOString(),
        }
    ]
};

export default function WorkspacePage() {
    const router = useRouter();
    const params = useParams<{ workspaceId: string }>();
    const workspaceId = params?.workspaceId as string;

    const isDemoWorkspace = workspaceId === 'demo-workspace';

    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([
        { displayName: 'Alex (Staff Eng)' },
        { displayName: 'Sarah (Founding Eng)' },
        { displayName: 'Shihab (AI Lead)' }
    ]);
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connectionState, setConnectionState] = useState<'connected' | 'disconnected' | 'reconnecting' | 'connecting'>('connected');
    const [loadingMessages, setLoadingMessages] = useState<boolean>(true);
    const [initialLoading, setInitialLoading] = useState<boolean>(true);
    const [showAISettings, setShowAISettings] = useState<boolean>(false);
    const [hasKey, setHasKey] = useState<boolean>(false);
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
    const pendingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    // Initialize User & Workspace
    useEffect(() => {
        const token = localStorage.getItem('devchat_token');

        if (isDemoWorkspace || !token) {
            // Setup demo guest session
            const guestUser: User = {
                _id: 'user-guest',
                displayName: 'Guest Developer',
                email: 'guest@devchat.local',
                role: 'guest',
            };
            setCurrentUser(guestUser);
            setWorkspace({
                _id: 'demo-workspace',
                name: 'Demo Engineering Team',
                inviteCode: 'devchat-demo-2026',
            });
            setChannels(DEMO_CHANNELS);
            setActiveChannel(DEMO_CHANNELS[0]);
            setInitialLoading(false);
            return;
        }

        api.token = token;
        api.getMe()
            .then((data) => {
                setCurrentUser(data.user || null);
                setHasKey(Boolean(data.hasOpenaiKey));
            })
            .catch(() => {
                // If getMe fails, fallback gracefully to demo workspace
                console.warn('Authentication check failed; falling back to demo session.');
                const guestUser: User = {
                    _id: 'user-guest',
                    displayName: 'Guest Developer',
                    email: 'guest@devchat.local',
                    role: 'guest',
                };
                setCurrentUser(guestUser);
                setWorkspace({
                    _id: 'demo-workspace',
                    name: 'Demo Engineering Team',
                    inviteCode: 'devchat-demo-2026',
                });
                setChannels(DEMO_CHANNELS);
                setActiveChannel(DEMO_CHANNELS[0]);
                setInitialLoading(false);
            });
    }, [isDemoWorkspace]);

    // Load Workspace & Channels for real users
    useEffect(() => {
        if (!currentUser || isDemoWorkspace || !workspaceId) return;

        const loadWorkspace = async () => {
            try {
                const ws = await api.getWorkspace(workspaceId);
                setWorkspace(ws);
                const chs = await api.getChannels(workspaceId);
                setChannels(chs);
                if (chs.length > 0) setActiveChannel(chs[0]);
                setInitialLoading(false);
            } catch (err) {
                console.warn('Failed to load workspace from backend, falling back to demo data:', err);
                setWorkspace({
                    _id: workspaceId,
                    name: 'Engineering Workspace',
                    inviteCode: 'devchat-2026',
                });
                setChannels(DEMO_CHANNELS);
                setActiveChannel(DEMO_CHANNELS[0]);
                setInitialLoading(false);
            }
        };
        loadWorkspace();
    }, [currentUser, workspaceId, isDemoWorkspace]);

    // Socket Lifecycle
    useEffect(() => {
        if (!currentUser || isDemoWorkspace || !workspaceId) return;

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

        s.on('onlineUsers', (users: OnlineUser[]) => setOnlineUsers(users));
        s.on('newMessage', (msg: Message) => {
            setMessages((prev) => {
                if (msg._tempId) {
                    const idx = prev.findIndex((m) => m._id === msg._tempId);
                    if (idx >= 0) {
                        const next = prev.slice();
                        const { _tempId, ...clean } = msg;
                        next[idx] = clean;
                        return next;
                    }
                }
                if (prev.find((m) => m._id === msg._id)) return prev;
                return [...prev, msg];
            });

            if (msg._tempId && pendingTimers.current.has(msg._tempId)) {
                const t = pendingTimers.current.get(msg._tempId);
                if (t) clearTimeout(t);
                pendingTimers.current.delete(msg._tempId);
            }
        });

        s.on('userTyping', (data: TypingUser) => {
            setTypingUsers((prev) => {
                if (prev.find((u) => u.userId === data.userId)) return prev;
                return [...prev, data];
            });
        });

        s.on('userStopTyping', (data: { userId: string }) => {
            setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
        });

        s.on('error', (err: { code?: string }) => {
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
    }, [currentUser, workspaceId, isDemoWorkspace, router]);

    // Channel Switch & Messages
    useEffect(() => {
        if (!activeChannel) return;
        setLoadingMessages(true);

        if (isDemoWorkspace || activeChannel._id.startsWith('ch-')) {
            const seed = DEMO_SEED_MESSAGES[activeChannel._id] || [];
            setMessages(seed);
            setLoadingMessages(false);
            return;
        }

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
            .catch(() => {
                // Fallback to seed messages if backend channel fails
                setMessages(DEMO_SEED_MESSAGES['ch-general'] || []);
            })
            .finally(() => setLoadingMessages(false));

        return () => {
            if (socket) socket.emit('leaveChannel', activeChannel._id);
        };
    }, [activeChannel, socket, isDemoWorkspace]);

    // Send Message Handler (with optimistic insert and demo echo)
    const handleSendMessage = useCallback((content: string, type?: string, language?: string) => {
        if (!activeChannel) return;
        const tempId = TEMP_ID();

        const optimistic: Message = {
            _id: tempId,
            _pending: !isDemoWorkspace,
            content,
            type: type || 'text',
            language: language || '',
            channel: activeChannel._id,
            user: {
                _id: currentUser?._id,
                displayName: currentUser?.displayName || 'You',
                avatar: currentUser?.avatar,
            },
            createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, optimistic]);

        if (isDemoWorkspace) {
            // Simulated interactive reply in demo mode
            if (type === 'code') {
                setTimeout(() => {
                    const botReply: Message = {
                        _id: `reply-${Date.now()}`,
                        content: `Nice snippet in ${language || 'code'}! Click "Explain Code" to see the AI breakdown.`,
                        type: 'text',
                        channel: activeChannel._id,
                        user: { _id: 'u-bot', displayName: 'DevChat Bot' },
                        createdAt: new Date().toISOString(),
                    };
                    setMessages((prev) => [...prev, botReply]);
                }, 1000);
            }
            return;
        }

        if (!socket) return;

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
    }, [socket, activeChannel, currentUser, isDemoWorkspace]);

    const handleRetry = useCallback((failedMsg: Message) => {
        setMessages((prev) => prev.filter((m) => m._id !== failedMsg._id));
        if (socket && activeChannel) {
            const tempId = TEMP_ID();
            const optimistic: Message = {
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
        if (!socket || !activeChannel || isDemoWorkspace) return;
        socket.emit('typing', activeChannel._id);
    }, [socket, activeChannel, isDemoWorkspace]);

    const handleStopTyping = useCallback(() => {
        if (!socket || !activeChannel || isDemoWorkspace) return;
        socket.emit('stopTyping', activeChannel._id);
    }, [socket, activeChannel, isDemoWorkspace]);

    const handleCreateChannel = useCallback(async (name: string) => {
        if (isDemoWorkspace) {
            const newCh: Channel = { _id: `ch-${Date.now()}`, name };
            setChannels((prev) => [...prev, newCh]);
            setActiveChannel(newCh);
            setSidebarOpen(false);
            return;
        }
        try {
            const channel = await api.createChannel(workspaceId, name);
            setChannels((prev) => [...prev, channel]);
            setActiveChannel(channel);
            setSidebarOpen(false);
        } catch (err) {
            console.error('Failed to create channel:', err);
        }
    }, [workspaceId, isDemoWorkspace]);

    const handleSelectChannel = useCallback((channel: Channel) => {
        setActiveChannel(channel);
        setSidebarOpen(false);
    }, []);

    const handleMissingKey = useCallback(() => {
        setShowAISettings(true);
    }, []);

    const handleLogout = useCallback(() => {
        api.clearToken();
        disconnectSocket();
        localStorage.removeItem('devchat_demo_mode');
        router.push('/');
    }, [router]);

    if (initialLoading) {
        return (
            <div className="flex h-screen bg-black">
                <div className="w-[260px] border-r border-[#1f1f1f] py-5 px-4 bg-[#080809]">
                    <div className="skeleton h-6 w-[70%] mb-6" />
                    <div className="skeleton h-3.5 w-[40%] mb-3" />
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="skeleton h-3.5 mb-2.5 ml-2" style={{ width: `${50 + i * 10}%` }} />
                    ))}
                </div>
                <div className="flex-1 bg-black" />
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <div className="flex h-screen bg-black text-[#ededed] overflow-hidden">
                {/* Connection Alert Banner */}
                {connectionState !== 'connected' && !isDemoWorkspace && (
                    <div className={`fixed top-0 left-0 right-0 z-50 px-4 py-1.5 text-center text-xs font-mono font-medium text-white ${
                        connectionState === 'disconnected' ? 'bg-[#ef4444]' : 'bg-[#f59e0b]'
                    }`}>
                        {connectionState === 'connecting' && 'Connecting to WebSocket mesh…'}
                        {connectionState === 'reconnecting' && 'Reconnecting… messages will sync once back online.'}
                        {connectionState === 'disconnected' && 'Disconnected. Attempting auto-reconnect…'}
                    </div>
                )}

                {/* Mobile Backdrop */}
                {sidebarOpen && (
                    <button
                        type="button"
                        aria-label="Close sidebar"
                        onClick={() => setSidebarOpen(false)}
                        className="md:hidden fixed inset-0 z-30 bg-black/80 backdrop-blur-sm cursor-default"
                    />
                )}

                {/* Sidebar */}
                <div className={`fixed md:static z-40 h-full transition-transform duration-200 ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                } md:translate-x-0`}>
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
                        isDemo={isDemoWorkspace}
                    />
                </div>

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-black">
                    {/* Mobile Header */}
                    <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f] bg-[#0a0a0a]">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="p-1 rounded text-[#a1a1a1] hover:text-white"
                                aria-label="Open sidebar"
                            >
                                ☰
                            </button>
                            <span className="text-[#52a8ff] font-mono">#</span>
                            <span className="text-xs font-semibold text-white truncate">
                                {activeChannel?.name || 'general'}
                            </span>
                        </div>
                        {isDemoWorkspace && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#52a8ff]/10 text-[#52a8ff] border border-[#52a8ff]/20">
                                Demo Mode
                            </span>
                        )}
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
                        isDemo={isDemoWorkspace}
                    />

                    <MessageInput
                        onSend={handleSendMessage}
                        onTyping={handleTyping}
                        onStopTyping={handleStopTyping}
                        disabled={connectionState === 'disconnected' && !isDemoWorkspace}
                    />
                </div>

                {/* AI Settings Modal */}
                <AISettings
                    open={showAISettings}
                    onClose={() => setShowAISettings(false)}
                    onChange={(info) => setHasKey(Boolean(info?.hasKey))}
                />
            </div>
        </ErrorBoundary>
    );
}
