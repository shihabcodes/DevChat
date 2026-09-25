'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import CodeBlock from './CodeBlock';
import { Avatar } from './ui/Brand';
import { PencilIcon, RefreshIcon, TrashIcon } from './ui/icons';
import type { Message } from '@/types';

export interface MessageBubbleProps {
    message: Message;
    /** Continuation of the previous message from the same author: no avatar or name. */
    grouped?: boolean;
    onRetry?: (message: Message) => void;
    onMissingKey?: () => void;
    preview?: boolean;
    /** The viewer wrote this message, so they may edit or delete it. */
    isOwn?: boolean;
    onEdit?: (message: Message, content: string) => Promise<void>;
    onDelete?: (message: Message) => Promise<void>;
}

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const fullFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export default function MessageBubble({ message, grouped, onRetry, onMissingKey, preview, isOwn, onEdit, onDelete }: MessageBubbleProps) {
    const date = new Date(message.createdAt);
    const time = timeFmt.format(date);
    const name = message.user?.displayName || 'Unknown';

    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(message.content);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const editRef = useRef<HTMLTextAreaElement | null>(null);

    const settled = !message._pending && !message._failed && !message.id.startsWith('tmp-');
    const canModify = Boolean(isOwn && settled && !preview && (onEdit || onDelete));

    useEffect(() => {
        if (!editing || !editRef.current) return;
        const el = editRef.current;
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
        el.style.height = `${Math.min(el.scrollHeight, 320)}px`;
        // Keep Save/Cancel visible when editing a message near the bottom of the list.
        el.parentElement?.scrollIntoView({ block: 'nearest' });
    }, [editing]);

    useEffect(() => {
        if (!confirmDelete) return;
        const t = setTimeout(() => setConfirmDelete(false), 4000);
        return () => clearTimeout(t);
    }, [confirmDelete]);

    const startEdit = () => {
        setDraft(message.content);
        setActionError(null);
        setEditing(true);
    };

    const saveEdit = async () => {
        const next = draft.trim();
        if (!next || next === message.content) return setEditing(false);
        setBusy(true);
        setActionError(null);
        try {
            await onEdit?.(message, next);
            setEditing(false);
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Could not save the edit.');
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        if (!confirmDelete) return setConfirmDelete(true);
        setBusy(true);
        try {
            await onDelete?.(message);
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Could not delete the message.');
            setBusy(false);
            setConfirmDelete(false);
        }
    };

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

            {canModify && !editing && (
                <div className={`absolute -top-3 right-5 z-10 flex items-center gap-0.5 rounded-lg border border-line-strong bg-surface p-0.5 shadow-lg shadow-black/40 transition-opacity focus-within:opacity-100 group-hover:opacity-100 ${
                    confirmDelete ? 'opacity-100' : 'opacity-0'
                }`}>
                    {onEdit && (
                        <button type="button" onClick={startEdit} className="icon-btn h-7 w-7" aria-label="Edit message" title="Edit">
                            <PencilIcon size={14} />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            type="button"
                            onClick={remove}
                            disabled={busy}
                            className={confirmDelete
                                ? 'inline-flex h-7 items-center rounded-md bg-danger-soft px-2 text-xs font-medium text-danger'
                                : 'icon-btn h-7 w-7 hover:text-danger'}
                            aria-label={confirmDelete ? 'Confirm delete' : 'Delete message'}
                            title={confirmDelete ? 'Click again to delete' : 'Delete'}
                        >
                            {confirmDelete ? 'Delete?' : <TrashIcon size={14} />}
                        </button>
                    )}
                </div>
            )}

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

                {editing ? (
                    <div className="mt-1">
                        <textarea
                            ref={editRef}
                            value={draft}
                            onChange={(e) => {
                                setDraft(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = `${Math.min(e.target.scrollHeight, 320)}px`;
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') setEditing(false);
                                const submit = message.type === 'code' ? (e.metaKey || e.ctrlKey) : !e.shiftKey;
                                if (e.key === 'Enter' && submit && !e.nativeEvent.isComposing) {
                                    e.preventDefault();
                                    saveEdit();
                                }
                            }}
                            aria-label="Edit message"
                            className={`w-full resize-none rounded-lg border border-line-strong bg-surface px-3 py-2 text-fg outline-none focus:border-fg-subtle focus-visible:outline-none ${
                                message.type === 'code' ? 'font-mono text-[13px]' : 'text-[14.5px]'
                            }`}
                        />
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-fg-subtle">
                            <button type="button" onClick={saveEdit} disabled={busy} className="btn btn-sm btn-primary">{busy ? 'Saving…' : 'Save'}</button>
                            <button type="button" onClick={() => setEditing(false)} className="btn btn-sm btn-ghost">Cancel</button>
                            <span className="hidden sm:inline">
                                {message.type === 'code' ? '⌘↵ to save' : '↵ to save'} · esc to cancel
                                {message.type === 'code' && message.aiExplanation ? ' · the AI explanation will be cleared' : ''}
                            </span>
                        </div>
                    </div>
                ) : (
                    <>
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
                        {grouped && message.editedAt && <span className="text-[11px] text-fg-subtle">(edited)</span>}
                    </>
                )}

                {actionError && <p className="mt-1 text-xs text-danger">{actionError}</p>}
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
