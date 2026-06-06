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
        <div className="flex-1 flex flex-col min-h-0">
            <div className="px-5 py-[0.85rem] border-b border-[#2D2D5E] bg-[rgba(15,15,35,0.8)] backdrop-blur-md flex items-center gap-2">
                <span className="text-[#6B7280] text-lg">#</span>
                <h3 className="text-[0.95rem] font-bold text-[#F9FAFB]">
                    {channel?.name || 'general'}
                </h3>
                {channel?.description && (
                    <>
                        <div className="w-px h-4 bg-[#2D2D5E] mx-1.5" />
                        <span className="text-[0.8rem] text-[#6B7280]">{channel.description}</span>
                    </>
                )}
            </div>

            <div ref={containerRef} className="flex-1 overflow-y-auto py-3">
                {loading ? (
                    <div className="px-5 flex flex-col gap-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex gap-2.5">
                                <div className="skeleton w-9 h-9 rounded-full flex-shrink-0" />
                                <div className="flex-1">
                                    <div className="skeleton h-3.5 mb-1.5" style={{ width: 100 }} />
                                    <div className="skeleton h-3.5" style={{ width: `${60 + Math.random() * 30}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-[#6B7280] gap-2">
                        <div className="text-[2.5rem] mb-2">💬</div>
                        <p className="text-base font-semibold text-[#9CA3AF]">No messages yet</p>
                        <p className="text-sm">
                            Be the first to say something in <strong className="text-[#A855F7]">#{channel?.name}</strong>
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

            {typingUsers.length > 0 && (
                <div className="animate-fade-in px-5 py-1.5 text-[0.75rem] text-[#6B7280] italic">
                    <span className="inline-flex gap-[3px] mr-1">
                        <span className="animate-pulse">•</span>
                        <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>•</span>
                        <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>•</span>
                    </span>
                    {typingUsers.map((u) => u.displayName).join(', ')}
                    {typingUsers.length === 1 ? ' is' : ' are'} typing
                </div>
            )}
        </div>
    );
}
