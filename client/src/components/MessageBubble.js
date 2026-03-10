'use client';

import CodeBlock from './CodeBlock';

export default function MessageBubble({ message, isOwn, onExplain }) {
    const time = new Date(message.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div
            className="animate-fade-in"
            style={{
                display: 'flex',
                gap: '0.65rem',
                padding: '0.5rem 1.25rem',
                transition: 'background 0.15s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.015)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
        >
            {/* Avatar */}
            <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: isOwn
                    ? 'linear-gradient(135deg, #4F46E5, #6366F1)'
                    : 'linear-gradient(135deg, #0EA5E9, #06B6D4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#fff',
                flexShrink: 0,
                marginTop: 2,
            }}>
                {message.user?.displayName?.[0]?.toUpperCase() || '?'}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span style={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: isOwn ? '#A78BFA' : '#38BDF8',
                    }}>
                        {message.user?.displayName || 'Unknown'}
                    </span>
                    <span style={{
                        fontSize: '0.65rem',
                        color: '#6B7280',
                    }}>
                        {time}
                    </span>
                </div>

                {message.type === 'code' ? (
                    <CodeBlock
                        code={message.content}
                        language={message.language}
                        messageId={message._id}
                        onExplain={onExplain}
                    />
                ) : (
                    <p style={{
                        fontSize: '0.875rem',
                        lineHeight: 1.55,
                        color: '#D1D5DB',
                        wordBreak: 'break-word',
                    }}>
                        {message.content}
                    </p>
                )}
            </div>
        </div>
    );
}
