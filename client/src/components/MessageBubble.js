'use client';

import CodeBlock from './CodeBlock';

export default function MessageBubble({ message, isOwn, onExplain, onMissingKey, onRetry }) {
    const date = new Date(message.createdAt);
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateLabel = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const isPending = Boolean(message._pending);
    const isFailed = Boolean(message._failed);

    return (
        <div
            className={`flex gap-3 px-6 py-2.5 transition-all hover:bg-white/[0.012] animate-fade-in border-l-2
                ${isOwn ? 'border-l-primary/10' : 'border-l-transparent'}
                ${isFailed ? 'opacity-70' : ''} ${isPending ? 'opacity-60' : ''}`}
        >
            {/* Avatar container (Squircle design) */}
            <div className="flex-shrink-0 mt-0.5">
                {message.user?.avatar ? (
                    <img
                        src={message.user.avatar}
                        alt={message.user?.displayName || 'User'}
                        className="w-9 h-9 rounded-xl object-cover border border-border/30 shadow-sm"
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-[0.8rem] font-extrabold text-white shadow-sm
                            ${isOwn
                                ? 'bg-gradient-to-br from-primary to-primary-light'
                                : 'bg-gradient-to-br from-[#0EA5E9] to-[#06B6D4]'}`}
                    >
                        {message.user?.displayName?.[0]?.toUpperCase() || '?'}
                    </div>
                )}
            </div>

            {/* Content right side */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-xs font-bold uppercase tracking-wider ${isOwn ? 'text-accent-purple' : 'text-[#38BDF8]'}`}>
                        {message.user?.displayName || 'Unknown'}
                    </span>
                    <span className="text-[0.65rem] font-medium text-text-dim" title={dateLabel}>
                        {dateLabel !== new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }) ? `${dateLabel} ` : ''}{time}
                    </span>
                    {isPending && (
                        <span className="text-[0.65rem] text-text-dim italic animate-pulse">sending…</span>
                    )}
                    {isFailed && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-[0.65rem] text-danger font-medium">Failed to send</span>
                            {onRetry && (
                                <button
                                    onClick={() => onRetry(message)}
                                    className="text-[0.65rem] text-primary hover:underline cursor-pointer font-bold"
                                >
                                    Retry
                                </button>
                            )}
                        </div>
                    )}
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
                    <div className="inline-block max-w-[90%] md:max-w-[80%]">
                        <div className={`rounded-2xl rounded-tl-none px-4 py-2.5 border shadow-sm leading-relaxed text-[0.85rem] text-text-primary break-words whitespace-pre-wrap
                            ${isOwn
                                ? 'bg-primary/5 border-primary/20'
                                : 'bg-bg-surface/35 border-border/40'}`}
                        >
                            {message.content}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
