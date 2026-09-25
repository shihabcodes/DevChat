'use client';

import { Fragment, useEffect, useLayoutEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import { Avatar } from './ui/Brand';
import { HashIcon, MenuIcon } from './ui/icons';
import type { Channel, Message, OnlineUser, TypingUser } from '@/types';

export interface ChatAreaProps {
    messages: Message[];
    channel: Channel | null;
    typingUsers?: TypingUser[];
    onlineUsers?: OnlineUser[];
    onRetry?: (message: Message) => void;
    onMissingKey?: () => void;
    onOpenSidebar?: () => void;
    loading?: boolean;
    isDemo?: boolean;
    /** Landing-page preview: no API calls from code blocks. */
    preview?: boolean;
}

const GROUP_WINDOW_MS = 5 * 60 * 1000;
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

function dayLabel(d: Date): string {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return dayFmt.format(d);
}

export default function ChatArea({
    messages,
    channel,
    typingUsers = [],
    onlineUsers = [],
    onRetry,
    onMissingKey,
    onOpenSidebar,
    loading,
    isDemo,
    preview,
}: ChatAreaProps) {
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const stickToBottom = useRef(true);

    // Follow new messages only if the reader is already near the bottom.
    const onScroll = () => {
        const el = scrollRef.current;
        if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    };
    useLayoutEffect(() => {
        const el = scrollRef.current;
        if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
    }, [messages, typingUsers.length]);
    useEffect(() => { stickToBottom.current = true; }, [channel?.id]);

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4 md:px-5">
                <div className="flex min-w-0 items-center gap-2">
                    {onOpenSidebar && (
                        <button type="button" onClick={onOpenSidebar} className="icon-btn -ml-1 md:hidden" aria-label="Open sidebar">
                            <MenuIcon size={18} />
                        </button>
                    )}
                    <HashIcon size={17} className="shrink-0 text-fg-subtle" />
                    <h1 className="truncate text-[15px] font-semibold">{channel?.name ?? '…'}</h1>
                    {channel?.topic && (
                        <p className="hidden truncate border-l border-line pl-3 text-[13px] text-fg-subtle sm:block">{channel.topic}</p>
                    )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                    {isDemo && (
                        <span className="rounded-md border border-accent/30 bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                            Demo
                        </span>
                    )}
                    {onlineUsers.length > 0 && (
                        <div className="flex items-center gap-2" title={onlineUsers.map((u) => u.displayName).join(', ')}>
                            <div className="flex -space-x-1.5">
                                {onlineUsers.slice(0, 4).map((u) => (
                                    <span key={u.id} className="rounded-[8px] ring-2 ring-bg">
                                        <Avatar name={u.displayName} seed={u.id} src={u.avatar} size={24} />
                                    </span>
                                ))}
                            </div>
                            <span className="hidden text-xs text-fg-subtle sm:inline">{onlineUsers.length} online</span>
                        </div>
                    )}
                </div>
            </header>

            <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto pb-3">
                {loading ? (
                    <div className="space-y-5 px-5 pt-6">
                        {[70, 45, 85, 55].map((w, i) => (
                            <div key={i} className="flex gap-3">
                                <div className="skeleton h-9 w-9 shrink-0" />
                                <div className="flex-1 space-y-2 pt-1">
                                    <div className="skeleton h-3 w-28" />
                                    <div className="skeleton h-3.5" style={{ width: `${w}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-surface text-fg-subtle">
                            <HashIcon size={22} />
                        </div>
                        <h2 className="text-base font-semibold">Welcome to #{channel?.name}</h2>
                        <p className="mt-1 max-w-sm text-sm text-fg-subtle">
                            This is the start of the channel. Say hello, or share a snippet with the code button below.
                        </p>
                    </div>
                ) : (
                    messages.map((msg, i) => {
                        const prev = messages[i - 1];
                        const date = new Date(msg.createdAt);
                        const newDay = !prev || new Date(prev.createdAt).toDateString() !== date.toDateString();
                        const grouped =
                            !newDay &&
                            !!prev &&
                            prev.user?.id === msg.user?.id &&
                            date.getTime() - new Date(prev.createdAt).getTime() < GROUP_WINDOW_MS;
                        return (
                            <Fragment key={msg.id}>
                                {newDay && (
                                    <div className="relative mb-1 mt-5 flex items-center px-5" role="separator">
                                        <div className="h-px flex-1 bg-line" />
                                        <span className="px-3 text-[11px] font-medium text-fg-subtle">{dayLabel(date)}</span>
                                        <div className="h-px flex-1 bg-line" />
                                    </div>
                                )}
                                <MessageBubble message={msg} grouped={grouped} onRetry={onRetry} onMissingKey={onMissingKey} preview={preview} />
                            </Fragment>
                        );
                    })
                )}
            </div>

            <div className="flex h-6 shrink-0 items-center gap-2 px-5 text-xs text-fg-subtle" aria-live="polite">
                {typingUsers.length > 0 && (
                    <>
                        <span className="flex gap-1"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></span>
                        <span>
                            <span className="font-medium text-fg-muted">{typingUsers.map((u) => u.displayName || 'Someone').join(', ')}</span>
                            {typingUsers.length === 1 ? ' is typing…' : ' are typing…'}
                        </span>
                    </>
                )}
            </div>
        </div>
    );
}
