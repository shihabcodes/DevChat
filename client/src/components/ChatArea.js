'use client';

import { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';

export default function ChatArea({
    messages,
    channel,
    currentUser,
    typingUsers,
    onExplain,
    loading,
}) {
    const bottomRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
        }}>
            {/* Channel Header */}
            <div style={{
                padding: '0.85rem 1.25rem',
                borderBottom: '1px solid #2D2D5E',
                background: 'rgba(15, 15, 35, 0.8)',
                backdropFilter: 'blur(12px)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
            }}>
                <span style={{ color: '#6B7280', fontSize: '1.1rem' }}>#</span>
                <h3 style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#F9FAFB',
                }}>
                    {channel?.name || 'general'}
                </h3>
                {channel?.description && (
                    <>
                        <div style={{ width: 1, height: 16, background: '#2D2D5E', margin: '0 0.35rem' }} />
                        <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>{channel.description}</span>
                    </>
                )}
            </div>

            {/* Messages */}
            <div
                ref={containerRef}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '0.75rem 0',
                }}
            >
                {loading ? (
                    <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {[...Array(5)].map((_, i) => (
                            <div key={i} style={{ display: 'flex', gap: '0.65rem' }}>
                                <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                    <div className="skeleton" style={{ width: 100, height: 14, marginBottom: 6 }} />
                                    <div className="skeleton" style={{ width: `${60 + Math.random() * 30}%`, height: 14 }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : messages.length === 0 ? (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: '#6B7280',
                        gap: '0.5rem',
                    }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💬</div>
                        <p style={{ fontSize: '1rem', fontWeight: 600, color: '#9CA3AF' }}>
                            No messages yet
                        </p>
                        <p style={{ fontSize: '0.85rem' }}>
                            Be the first to say something in <strong style={{ color: '#A855F7' }}>#{channel?.name}</strong>
                        </p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <MessageBubble
                            key={msg._id}
                            message={msg}
                            isOwn={msg.user?._id === currentUser?._id}
                            onExplain={onExplain}
                        />
                    ))
                )}
                <div ref={bottomRef} />
            </div>

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
                <div className="animate-fade-in" style={{
                    padding: '0.35rem 1.25rem',
                    fontSize: '0.75rem',
                    color: '#6B7280',
                    fontStyle: 'italic',
                }}>
                    <span style={{ display: 'inline-flex', gap: 3, marginRight: 4 }}>
                        <span style={{ animation: 'pulse-glow 1s infinite' }}>•</span>
                        <span style={{ animation: 'pulse-glow 1s infinite 0.2s' }}>•</span>
                        <span style={{ animation: 'pulse-glow 1s infinite 0.4s' }}>•</span>
                    </span>
                    {typingUsers.map((u) => u.displayName).join(', ')}
                    {typingUsers.length === 1 ? ' is' : ' are'} typing
                </div>
            )}
        </div>
    );
}
