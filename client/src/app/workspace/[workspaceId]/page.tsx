'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import MessageInput from '@/components/MessageInput';
import ErrorBoundary from '@/components/ErrorBoundary';
import AISettings from '@/components/AISettings';
import { getKeyInfo } from '@/lib/ai';
import * as data from '@/lib/data';
import { useChannelRealtime, useWorkspacePresence } from '@/lib/realtime';
import type { User, Workspace, Channel, Message, MessageType } from '@/types';

const tempId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function byCreatedAt(a: Message, b: Message) {
    return a.createdAt.localeCompare(b.createdAt);
}

export default function WorkspacePage() {
    const router = useRouter();
    const params = useParams<{ workspaceId: string }>();
    const workspaceId = params?.workspaceId as string;

    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingMessages, setLoadingMessages] = useState<boolean>(true);
    const [initialLoading, setInitialLoading] = useState<boolean>(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
    const [showAISettings, setShowAISettings] = useState<boolean>(false);
    const [hasKey, setHasKey] = useState<boolean>(false);
    const messagesRef = useRef<Message[]>([]);
    messagesRef.current = messages;

    // Session, workspace and channels
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const user = await data.getCurrentUser();
                if (!user) {
                    router.replace('/');
                    return;
                }
                const ws = await data.getWorkspace(workspaceId);
                if (cancelled) return;
                setCurrentUser(user);
                if (!ws) {
                    setLoadError("This workspace doesn't exist, or you're not a member of it.");
                    return;
                }
                const chs = await data.listChannels(workspaceId);
                if (cancelled) return;
                setWorkspace(ws);
                setChannels(chs);
                getKeyInfo().then((k) => setHasKey(k.hasKey)).catch(() => {/* AI is optional */});
                setActiveChannel(chs.find((c) => c.name === 'general') ?? chs[0] ?? null);
            } catch (err) {
                if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load workspace.');
            } finally {
                if (!cancelled) setInitialLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [workspaceId, router]);

    // Messages for the active channel
    useEffect(() => {
        if (!activeChannel) return;
        let cancelled = false;
        setLoadingMessages(true);
        setMessages([]);
        data.listRecentMessages(activeChannel.id)
            .then((msgs) => { if (!cancelled) setMessages(msgs); })
            .catch((err) => { if (!cancelled) setLoadError(err.message); })
            .finally(() => { if (!cancelled) setLoadingMessages(false); });
        return () => { cancelled = true; };
    }, [activeChannel]);

    // Live updates
    const upsertMessage = useCallback((msg: Message) => {
        setMessages((prev) => {
            if (msg.channelId !== activeChannel?.id) return prev;
            const idx = prev.findIndex((m) => m.id === msg.id);
            if (idx >= 0) {
                const next = prev.slice();
                next[idx] = msg;
                return next;
            }
            return [...prev, msg].sort(byCreatedAt);
        });
    }, [activeChannel]);

    const refetchMessage = useCallback(async (id: string) => {
        try {
            const msg = await data.getMessage(id);
            if (msg) upsertMessage(msg);
        } catch {/* next load will catch up */}
    }, [upsertMessage]);

    const onlineUsers = useWorkspacePresence(workspace?.id ?? null, currentUser);
    const { typingUsers, connection, sendTyping } = useChannelRealtime(activeChannel?.id ?? null, currentUser, {
        onMessageInserted: (id) => {
            // Our own sends are already in the list via the insert response.
            if (!messagesRef.current.some((m) => m.id === id)) refetchMessage(id);
        },
        onMessageUpdated: refetchMessage,
        onMessageDeleted: (id) => setMessages((prev) => prev.filter((m) => m.id !== id)),
        onResync: () => {
            const channelId = activeChannel?.id;
            if (!channelId) return;
            data.listRecentMessages(channelId).then((fresh) => {
                setMessages((prev) => {
                    if (prev.some((m) => m.channelId !== channelId)) return prev;
                    // Keep unsent/failed placeholders; everything else comes from the server.
                    const local = prev.filter((m) => m._pending || m._failed);
                    return [...fresh, ...local].sort(byCreatedAt);
                });
            }).catch(() => {/* next reconnect will try again */});
        },
    });

    // Sending, with an optimistic placeholder until the insert returns
    const deliver = useCallback(async (placeholder: Message) => {
        setMessages((prev) => [...prev, placeholder]);
        try {
            const saved = await data.sendMessage(
                placeholder.channelId, currentUser!.id, placeholder.content, placeholder.type, placeholder.language);
            setMessages((prev) => {
                const withoutTemp = prev.filter((m) => m.id !== placeholder.id);
                return withoutTemp.some((m) => m.id === saved.id) ? withoutTemp : [...withoutTemp, saved].sort(byCreatedAt);
            });
        } catch (err) {
            setMessages((prev) => prev.map((m) => m.id === placeholder.id
                ? { ...m, _pending: false, _failed: true, _error: err instanceof Error ? err.message : 'Failed to send' }
                : m));
        }
    }, [currentUser]);

    const handleSendMessage = useCallback((content: string, type: MessageType = 'text', language = '') => {
        if (!activeChannel || !currentUser) return;
        sendTyping(false);
        deliver({
            id: tempId(),
            channelId: activeChannel.id,
            content,
            type,
            language,
            user: currentUser,
            createdAt: new Date().toISOString(),
            _pending: true,
        });
    }, [activeChannel, currentUser, deliver, sendTyping]);

    const handleRetry = useCallback((failed: Message) => {
        setMessages((prev) => prev.filter((m) => m.id !== failed.id));
        deliver({ ...failed, id: tempId(), createdAt: new Date().toISOString(), _failed: false, _error: undefined, _pending: true });
    }, [deliver]);

    const handleCreateChannel = useCallback(async (name: string) => {
        if (!workspace || !currentUser) return;
        try {
            const channel = await data.createChannel(workspace.id, currentUser.id, name);
            setChannels((prev) => [...prev, channel]);
            setActiveChannel(channel);
            setSidebarOpen(false);
        } catch (err) {
            window.alert(err instanceof Error ? err.message : 'Failed to create channel');
        }
    }, [workspace, currentUser]);

    const handleSelectChannel = useCallback((channel: Channel) => {
        setActiveChannel(channel);
        setSidebarOpen(false);
    }, []);

    const handleLogout = useCallback(async () => {
        await data.signOut();
        router.push('/');
    }, [router]);

    const isDemo = Boolean(currentUser?.isGuest);

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

    if (loadError && !workspace) {
        return (
            <div className="flex h-screen items-center justify-center bg-black px-4 text-center">
                <div className="max-w-sm">
                    <p className="text-sm text-[#ededed] mb-4">{loadError}</p>
                    <Link href="/" className="text-xs font-mono text-[#52a8ff] hover:underline">← Back to DevChat</Link>
                </div>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <div className="flex h-screen bg-black text-[#ededed] overflow-hidden">
                {connection !== 'connected' && activeChannel && (
                    <div className={`fixed top-0 left-0 right-0 z-50 px-4 py-1.5 text-center text-xs font-mono font-medium text-white ${
                        connection === 'disconnected' ? 'bg-[#ef4444]' : 'bg-[#f59e0b]'
                    }`}>
                        {connection === 'connecting' && 'Connecting…'}
                        {connection === 'reconnecting' && 'Reconnecting… messages will sync once back online.'}
                        {connection === 'disconnected' && 'Live updates are offline. Refresh the page to reconnect.'}
                    </div>
                )}

                {sidebarOpen && (
                    <button
                        type="button"
                        aria-label="Close sidebar"
                        onClick={() => setSidebarOpen(false)}
                        className="md:hidden fixed inset-0 z-30 bg-black/80 backdrop-blur-sm cursor-default"
                    />
                )}

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
                        isDemo={isDemo}
                    />
                </div>

                <div className="flex-1 flex flex-col min-w-0 bg-black">
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
                        {isDemo && (
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
                        onRetry={handleRetry}
                        onMissingKey={() => setShowAISettings(true)}
                        loading={loadingMessages}
                        isDemo={isDemo}
                    />

                    <MessageInput
                        onSend={handleSendMessage}
                        onTyping={() => sendTyping(true)}
                        onStopTyping={() => sendTyping(false)}
                        disabled={!activeChannel}
                    />
                </div>

                <AISettings
                    open={showAISettings}
                    onClose={() => setShowAISettings(false)}
                    onChange={(info) => setHasKey(info.hasKey)}
                />
            </div>
        </ErrorBoundary>
    );
}
