'use client';

import { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';

export default function ChatArea({
    messages,
    channel,
    currentUser,
    typingUsers,
    onExplain,
    onMissingKey,
    onRetry,
    loading,
}) {
    const bottomRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-[#0F0F23]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border/25 bg-bg-dark/45 backdrop-blur-md flex items-center justify-between z-10 shadow-sm">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-primary font-bold text-lg">#</span>
                    <h3 className="text-sm font-bold text-text-primary truncate uppercase tracking-wider">
                        {channel?.name || 'general'}
                    </h3>
                    {channel?.description && (
                        <>
                            <div className="w-px h-3.5 bg-border/40 mx-2" />
                            <span className="text-xs text-text-muted truncate">{channel.description}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Message Area */}
            <div ref={containerRef} className="flex-1 overflow-y-auto py-4">
                {loading ? (
                    <div className="px-6 flex flex-col gap-5">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex gap-3 animate-pulse">
                                <div className="skeleton w-9 h-9 rounded-full flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="skeleton h-3 w-[80px]" />
                                    <div className="skeleton h-4 w-[60%]" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4 max-w-sm mx-auto animate-fade-in">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl mb-4 text-primary shadow-[0_4px_16px_rgba(79,70,229,0.08)]">
                            💬
                        </div>
                        <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-1">
                            Welcome to #{channel?.name || 'general'}!
                        </h4>
                        <p className="text-xs text-text-muted leading-relaxed mb-4">
                            This is the start of the #{channel?.name || 'general'} channel. Send a text message or click the code mode button below to share a code snippet!
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
                        />
                    ))
                )}
                <div ref={bottomRef} />
            </div>

            {/* Typing Indicators */}
            {typingUsers.length > 0 && (
                <div className="animate-fade-in px-6 py-2 text-[0.72rem] text-text-muted/80 flex items-center gap-2 font-medium border-t border-border/10 bg-bg-dark/10">
                    <span className="inline-flex gap-1 items-center">
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                    </span>
                    <span>
                        <span className="font-semibold text-text-muted">{typingUsers.map((u) => u.displayName).join(', ')}</span>{' '}
                        {typingUsers.length === 1 ? 'is' : 'are'} typing...
                    </span>
                </div>
            )}
        </div>
    );
}
