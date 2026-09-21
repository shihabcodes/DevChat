'use client';

import CodeBlock from './CodeBlock';
import { Message } from '@/types';

export interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
    onExplain?: any;
    onMissingKey?: () => void;
    onRetry?: (message: Message) => void;
    isDemo?: boolean;
}

export default function MessageBubble({
    message,
    isOwn,
    onExplain,
    onMissingKey,
    onRetry,
    isDemo,
}: MessageBubbleProps) {
    const date = message.createdAt ? new Date(message.createdAt) : new Date();
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isPending = Boolean(message._pending);
    const isFailed = Boolean(message._failed);

    return (
        <div
            className={`flex gap-3 px-6 py-2 transition-colors hover:bg-white/[0.015] animate-fade-in ${
                isFailed ? 'opacity-70' : ''
            } ${isPending ? 'opacity-60' : ''}`}
        >
            {/* Avatar */}
            <div className="shrink-0 mt-0.5">
                {message.user?.avatar ? (
                    <img
                        src={message.user.avatar}
                        alt={message.user?.displayName || 'User'}
                        className="w-8 h-8 rounded-lg object-cover border border-[#2e2e2e]"
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#2e2e2e] flex items-center justify-center text-xs font-bold text-white">
                        {message.user?.displayName?.[0]?.toUpperCase() || 'U'}
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium ${isOwn ? 'text-[#52a8ff]' : 'text-white'}`}>
                        {message.user?.displayName || 'Unknown'}
                    </span>
                    <span className="text-[10px] font-mono text-[#565656]">
                        {time}
                    </span>
                    {isPending && (
                        <span className="text-[10px] text-[#71717a] font-mono animate-pulse">sending…</span>
                    )}
                    {isFailed && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[#ef4444] font-medium">Failed</span>
                            {onRetry && (
                                <button
                                    onClick={() => onRetry(message)}
                                    className="text-[10px] text-[#52a8ff] hover:underline cursor-pointer font-mono"
                                >
                                    Retry
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {message.type === 'code' ? (
                    <CodeBlock
                        code={message.content || ''}
                        language={message.language}
                        messageId={message._id}
                        onMissingKey={onMissingKey}
                        cachedExplanation={message.aiExplanation}
                        isDemo={isDemo}
                    />
                ) : (
                    <div className="text-xs text-[#d4d4d8] leading-relaxed break-words whitespace-pre-wrap">
                        {message.content}
                    </div>
                )}
            </div>
        </div>
    );
}
