'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import CodeBlock from './CodeBlock';
import { Avatar } from './ui/Brand';
import { RefreshIcon } from './ui/icons';
import type { Message } from '@/types';

export interface MessageBubbleProps {
    message: Message;
    /** Continuation of the previous message from the same author: no avatar or name. */
    grouped?: boolean;
    onRetry?: (message: Message) => void;
    onMissingKey?: () => void;
    preview?: boolean;
}

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const fullFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export default function MessageBubble({ message, grouped, onRetry, onMissingKey, preview }: MessageBubbleProps) {
    const date = new Date(message.createdAt);
    const time = timeFmt.format(date);
    const name = message.user?.displayName || 'Unknown';

    return (
        <div
            className={`group relative flex gap-3 px-5 transition-colors hover:bg-white/[0.02] ${grouped ? 'py-0.5' : 'mt-3 pt-1.5 pb-0.5'} ${
                message._pending ? 'opacity-60' : ''
            }`}
        >
            <div className="w-9 shrink-0 pt-0.5">
                {grouped ? (
                    <time
                        dateTime={message.createdAt}
                        title={fullFmt.format(date)}
                        className="block pt-[3px] text-right font-mono text-[10px] text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100"
                    >
                        {time.replace(/\s?[AP]M$/i, '')}
                    </time>
                ) : (
                    <Avatar name={name} seed={message.user?.id} src={message.user?.avatar} size={36} />
                )}
            </div>

            <div className="min-w-0 flex-1">
                {!grouped && (
                    <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-fg">{name}</span>
                        <time dateTime={message.createdAt} title={fullFmt.format(date)} className="text-[11px] text-fg-subtle">
                            {time}
                        </time>
                        {message.editedAt && <span className="text-[11px] text-fg-subtle">(edited)</span>}
                    </div>
                )}

                {message.type === 'code' ? (
                    <CodeBlock
                        code={message.content}
                        language={message.language}
                        messageId={message.id}
                        cachedExplanation={message.aiExplanation}
                        onMissingKey={onMissingKey}
                        preview={preview}
                    />
                ) : (
                    <div className="prose-chat text-[14.5px] text-fg/90">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeSanitize]}
                            components={{ a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noreferrer" /> }}
                        >
                            {message.content}
                        </ReactMarkdown>
                    </div>
                )}

                {message._pending && <p className="mt-0.5 text-[11px] text-fg-subtle">Sending…</p>}
                {message._failed && (
                    <p className="mt-1 flex items-center gap-2 text-xs text-danger">
                        {message._error || 'Failed to send.'}
                        {onRetry && (
                            <button
                                type="button"
                                onClick={() => onRetry(message)}
                                className="inline-flex items-center gap-1 font-medium text-fg-muted hover:text-fg"
                            >
                                <RefreshIcon size={12} /> Retry
                            </button>
                        )}
                    </p>
                )}
            </div>
        </div>
    );
}
