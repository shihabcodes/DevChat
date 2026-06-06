'use client';

import CodeBlock from './CodeBlock';

export default function MessageBubble({ message, isOwn, onExplain, onMissingKey }) {
    const date = new Date(message.createdAt);
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateLabel = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

    return (
        <div
            className="flex gap-2.5 px-5 py-2 transition-colors hover:bg-white/[0.015] animate-fade-in"
        >
            <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-[0.8rem] font-bold text-white flex-shrink-0 mt-0.5
                    ${isOwn
                        ? 'bg-gradient-to-br from-[#4F46E5] to-[#6366F1]'
                        : 'bg-gradient-to-br from-[#0EA5E9] to-[#06B6D4]'}`}
            >
                {message.user?.displayName?.[0]?.toUpperCase() || '?'}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                    <span className={`text-[0.85rem] font-semibold ${isOwn ? 'text-[#A78BFA]' : 'text-[#38BDF8]'}`}>
                        {message.user?.displayName || 'Unknown'}
                    </span>
                    <span className="text-[0.65rem] text-[#6B7280]" title={dateLabel}>
                        {dateLabel !== new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }) ? `${dateLabel} ` : ''}{time}
                    </span>
                </div>

                {message.type === 'code' ? (
                    <CodeBlock
                        code={message.content}
                        language={message.language}
                        messageId={message._id}
                        onExplain={onExplain}
                        onMissingKey={onMissingKey}
                    />
                ) : (
                    <p className="text-[0.875rem] leading-relaxed text-[#D1D5DB] break-words whitespace-pre-wrap">
                        {message.content}
                    </p>
                )}
            </div>
        </div>
    );
}
