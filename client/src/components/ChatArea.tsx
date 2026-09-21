'use client';

import { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import { Channel, Message, User, TypingUser } from '@/types';

export interface ChatAreaProps {
    messages: Message[];
    channel: Channel | null;
    currentUser: User | null;
    typingUsers?: TypingUser[];
    onExplain?: any;
    onMissingKey?: () => void;
    onRetry?: (message: Message) => void;
    loading?: boolean;
    isDemo?: boolean;
}

export default function ChatArea({
    messages,
    channel,
    currentUser,
    typingUsers,
    onExplain,
    onMissingKey,
    onRetry,
    loading,
    isDemo,
}: ChatAreaProps) {
    const bottomRef = useRef<HTMLDivElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-black font-sans">
            {/* Top Channel Header */}
            <div className="px-6 py-3.5 border-b border-[#1f1f1f] bg-[#0a0a0c] flex items-center justify-between z-10">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[#52a8ff] font-mono text-base font-bold">#</span>
                    <h3 className="text-xs font-semibold text-white truncate tracking-tight">
                        {channel?.name || 'general'}
                    </h3>
                    {channel?.topic && (
                        <>
                            <div className="w-px h-3 bg-[#2e2e2e] mx-1" />
                            <span className="text-xs text-[#71717a] truncate">{channel.topic}</span>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
                    <span className="text-[11px] font-mono text-[#71717a]">
                        {isDemo ? 'Sandbox Demo' : 'Live Channel'}
                    </span>
                </div>
            </div>

            {/* Message Feed */}
            <div ref={containerRef} className="flex-1 overflow-y-auto py-4">
                {loading ? (
                    <div className="px-6 flex flex-col gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex gap-3 animate-pulse">
                                <div className="skeleton w-8 h-8 rounded-lg shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="skeleton h-3 w-[80px]" />
                                    <div className="skeleton h-4 w-[60%]" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4 max-w-sm mx-auto animate-fade-in">
                        <div className="w-12 h-12 rounded-xl bg-[#141414] border border-[#2e2e2e] flex items-center justify-center text-xl mb-3 text-[#52a8ff]">
                            #
                        </div>
                        <h4 className="text-xs font-semibold text-white mb-1">
                            Start of #{channel?.name || 'general'}
                        </h4>
                        <p className="text-xs text-[#71717a] leading-relaxed">
                            Send a message or click Code Mode below to share a syntax-highlighted code snippet with in-line AI.
                        </p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <MessageBubble
                            key={msg._id}
                            message={msg}
                            isOwn={msg.user?._id === currentUser?._id}
                            onExplain={onExplain}
                            onMissingKey={onMissingKey}
                            onRetry={onRetry}
                            isDemo={isDemo}
                        />
                    ))
                )}
                <div ref={bottomRef} />
            </div>

            {/* Typing Indicators */}
            {typingUsers && typingUsers.length > 0 && (
                <div className="animate-fade-in px-6 py-1.5 text-[11px] text-[#71717a] flex items-center gap-2 border-t border-[#1f1f1f] bg-[#0a0a0c]">
                    <span className="inline-flex gap-1 items-center">
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                    </span>
                    <span>
                        <span className="text-[#a1a1a1]">{typingUsers.map((u) => u.displayName || u.userId).join(', ')}</span>{' '}
                        {typingUsers.length === 1 ? 'is' : 'are'} typing…
                    </span>
                </div>
            )}
        </div>
    );
}
