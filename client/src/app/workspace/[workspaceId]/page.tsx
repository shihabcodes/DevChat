'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import MessageInput from '@/components/MessageInput';
import ErrorBoundary from '@/components/ErrorBoundary';
import AISettings from '@/components/AISettings';
import QuickSwitcher from '@/components/QuickSwitcher';
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
    const [hasMore, setHasMore] = useState<boolean>(false);
    const [loadingOlder, setLoadingOlder] = useState<boolean>(false);
    const [switcherOpen, setSwitcherOpen] = useState<boolean>(false);
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
        setHasMore(false);
        data.listRecentMessages(activeChannel.id)
            .then((msgs) => {
                if (cancelled) return;
                setMessages(msgs);
                setHasMore(msgs.length === data.PAGE_SIZE);
            })
            .catch((err) => { if (!cancelled) setLoadError(err.message); })
            .finally(() => { if (!cancelled) setLoadingMessages(false); });
        return () => { cancelled = true; };
    }, [activeChannel]);

    // Older history, fetched when the reader scrolls to the top
    const loadOlder = useCallback(async () => {
        const channelId = activeChannel?.id;
        const oldest = messagesRef.current.find((m) => !m._pending && !m._failed);
        if (!channelId || !oldest || loadingOlder) return;
        setLoadingOlder(true);
        try {
            const older = await data.listRecentMessages(channelId, oldest.createdAt);
            setMessages((prev) => {
                if (prev[0]?.channelId && prev[0].channelId !== channelId) return prev;
                const known = new Set(prev.map((m) => m.id));
                return [...older.filter((m) => !known.has(m.id)), ...prev];
            });
            setHasMore(older.length === data.PAGE_SIZE);
        } catch {
            setHasMore(false);
        } finally {
            setLoadingOlder(false);
        }
    }, [activeChannel, loadingOlder]);

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

    // Edits and deletes apply locally right away; realtime tells everyone else.
    const handleEdit = useCallback(async (message: Message, content: string) => {
        const saved = await data.editMessage(message.id, content);
        upsertMessage(saved);
    }, [upsertMessage]);

    const handleDelete = useCallback(async (message: Message) => {
        await data.deleteMessage(message.id);
        setMessages((prev) => prev.filter((m) => m.id !== message.id));
    }, []);

    // ⌘K / Ctrl+K opens the channel switcher.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setSwitcherOpen((v) => !v);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Errors propagate to the sidebar, which shows them inline.
    const handleCreateChannel = useCallback(async (name: string) => {
        if (!workspace || !currentUser) return;
        const channel = await data.createChannel(workspace.id, currentUser.id, name);
        setChannels((prev) => [...prev, channel]);
        setActiveChannel(channel);
        setSidebarOpen(false);
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
            <div className="flex h-dvh bg-bg">
                <div className="hidden w-[260px] space-y-3 border-r border-line bg-panel p-4 md:block">
                    <div className="skeleton mb-6 h-6 w-2/3" />
                    {[60, 45, 70, 50].map((w, i) => <div key={i} className="skeleton h-4" style={{ width: `${w}%` }} />)}
                </div>
                <div className="flex-1" />
            </div>
        );
    }

    if (loadError && !workspace) {
        return (
            <div className="flex h-dvh items-center justify-center bg-bg px-6 text-center">
                <div className="max-w-sm">
                    <h1 className="text-lg font-semibold">Can&apos;t open this workspace</h1>
                    <p className="mt-2 text-sm text-fg-muted">{loadError}</p>
                    <Link href="/" className="btn btn-secondary mt-6">Back to DevChat</Link>
                </div>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <div className="flex h-dvh overflow-hidden bg-bg text-fg">
                {connection !== 'connected' && activeChannel && (
                    <div
                        role="status"
                        className={`fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-full border px-3 py-1 text-xs font-medium shadow-lg shadow-black/40 ${
                            connection === 'disconnected'
                                ? 'border-danger/30 bg-[#2a1214] text-[#ffb3b5]'
                                : 'border-accent/30 bg-[#2a2010] text-accent'
                        }`}
                    >
                        {connection === 'connecting' && 'Connecting…'}
                        {connection === 'reconnecting' && 'Reconnecting… messages will sync when you\'re back'}
                        {connection === 'disconnected' && 'Offline. Refresh to reconnect.'}
                    </div>
                )}

                {sidebarOpen && (
                    <button
                        type="button"
                        aria-label="Close sidebar"
                        onClick={() => setSidebarOpen(false)}
                        className="fixed inset-0 z-30 cursor-default bg-black/70 backdrop-blur-sm md:hidden"
                    />
                )}

                <div className={`fixed z-40 h-full transition-transform duration-200 md:static md:translate-x-0 ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}>
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
                        onClose={() => setSidebarOpen(false)}
                        onOpenSwitcher={() => { setSidebarOpen(false); setSwitcherOpen(true); }}
                    />
                </div>

                <main className="flex min-w-0 flex-1 flex-col">
                    <ChatArea
                        messages={messages}
                        channel={activeChannel}
                        typingUsers={typingUsers}
                        onlineUsers={onlineUsers}
                        onRetry={handleRetry}
                        onMissingKey={() => setShowAISettings(true)}
                        onOpenSidebar={() => setSidebarOpen(true)}
                        loading={loadingMessages}
                        isDemo={isDemo}
                        currentUserId={currentUser?.id}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        hasMore={hasMore}
                        loadingOlder={loadingOlder}
                        onLoadOlder={loadOlder}
                    />

                    <MessageInput
                        onSend={handleSendMessage}
                        onTyping={() => sendTyping(true)}
                        onStopTyping={() => sendTyping(false)}
                        disabled={!activeChannel}
                        placeholder={activeChannel ? `Message #${activeChannel.name}` : undefined}
                    />
                </main>

                <QuickSwitcher
                    open={switcherOpen}
                    channels={channels}
                    activeChannelId={activeChannel?.id}
                    onSelect={handleSelectChannel}
                    onClose={() => setSwitcherOpen(false)}
                />

                <AISettings
                    open={showAISettings}
                    onClose={() => setShowAISettings(false)}
                    onChange={(info) => setHasKey(info.hasKey)}
                />
            </div>
        </ErrorBoundary>
    );
}
