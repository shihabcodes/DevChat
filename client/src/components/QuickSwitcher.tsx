'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { HashIcon, SearchIcon } from './ui/icons';
import type { Channel } from '@/types';

interface QuickSwitcherProps {
    open: boolean;
    channels: Channel[];
    activeChannelId?: string;
    onSelect: (channel: Channel) => void;
    onClose: () => void;
}

/** ⌘K / Ctrl+K channel switcher: type to filter, ↑↓ to move, ↵ to jump. */
export default function QuickSwitcher({ open, channels, activeChannelId, onSelect, onClose }: QuickSwitcherProps) {
    const [query, setQuery] = useState('');
    const [index, setIndex] = useState(0);
    const listRef = useRef<HTMLUListElement | null>(null);

    const results = useMemo(() => {
        const q = query.trim().toLowerCase().replace(/^#/, '');
        if (!q) return channels;
        // Prefix matches first, then anything containing the query.
        const starts = channels.filter((c) => c.name.startsWith(q));
        const contains = channels.filter((c) => !c.name.startsWith(q) && c.name.includes(q));
        return [...starts, ...contains];
    }, [channels, query]);

    useEffect(() => {
        if (open) {
            setQuery('');
            setIndex(0);
        }
    }, [open]);

    useEffect(() => setIndex(0), [query]);

    useEffect(() => {
        listRef.current?.children[index]?.scrollIntoView({ block: 'nearest' });
    }, [index]);

    if (!open) return null;

    const choose = (channel?: Channel) => {
        if (!channel) return;
        onSelect(channel);
        onClose();
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setIndex((i) => Math.min(i + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            choose(results[index]);
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <div
            className="animate-fade-in fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[15vh] backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div role="dialog" aria-modal="true" aria-label="Jump to channel" className="w-full max-w-lg overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-2xl shadow-black/60">
                <div className="flex items-center gap-2.5 border-b border-line px-4">
                    <SearchIcon size={16} className="text-fg-subtle" />
                    <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Jump to a channel…"
                        aria-label="Search channels"
                        role="combobox"
                        aria-expanded="true"
                        aria-controls="quick-switcher-list"
                        aria-activedescendant={results[index] ? `qs-${results[index].id}` : undefined}
                        className="h-12 w-full bg-transparent text-[15px] outline-none placeholder:text-fg-subtle focus-visible:outline-none"
                    />
                    <span className="kbd">esc</span>
                </div>
                <ul ref={listRef} id="quick-switcher-list" role="listbox" className="max-h-80 overflow-y-auto p-1.5">
                    {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-fg-subtle">No channels match “{query}”.</li>}
                    {results.map((c, i) => (
                        <li
                            key={c.id}
                            id={`qs-${c.id}`}
                            role="option"
                            aria-selected={i === index}
                            onMouseMove={() => setIndex(i)}
                            onClick={() => choose(c)}
                            className={`flex h-10 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm ${
                                i === index ? 'bg-elevated text-fg' : 'text-fg-muted'
                            }`}
                        >
                            <HashIcon size={15} className="text-fg-subtle" />
                            <span className="flex-1 truncate">{c.name}</span>
                            {c.id === activeChannelId && <span className="text-xs text-fg-subtle">current</span>}
                            {i === index && <span className="kbd">↵</span>}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
