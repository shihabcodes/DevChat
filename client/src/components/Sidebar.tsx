'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Avatar, LogoMark } from './ui/Brand';
import { CheckIcon, CopyIcon, HashIcon, KeyIcon, LinkIcon, LogOutIcon, PlusIcon, XIcon } from './ui/icons';
import type { Workspace, Channel, OnlineUser, User } from '@/types';

export interface SidebarProps {
    workspace: Workspace | null;
    channels: Channel[];
    activeChannel: Channel | null;
    onSelectChannel: (channel: Channel) => void;
    /** Rejects with a user-facing message if the channel can't be created. */
    onCreateChannel: (name: string) => Promise<void>;
    onlineUsers: OnlineUser[];
    currentUser: User | null;
    onLogout: () => void;
    onOpenAISettings: () => void;
    hasOpenaiKey?: boolean;
    isDemo?: boolean;
    onClose?: () => void;
}

export default function Sidebar({
    workspace,
    channels,
    activeChannel,
    onSelectChannel,
    onCreateChannel,
    onlineUsers,
    currentUser,
    onLogout,
    onOpenAISettings,
    hasOpenaiKey,
    isDemo,
    onClose,
}: SidebarProps) {
    const [creating, setCreating] = useState(false);
    const [newChannel, setNewChannel] = useState('');
    const [createError, setCreateError] = useState<string | null>(null);
    const [showInvite, setShowInvite] = useState(false);
    const [copied, setCopied] = useState(false);
    const inviteRef = useRef<HTMLDivElement | null>(null);

    // Close the invite popover on outside click or Escape.
    useEffect(() => {
        if (!showInvite) return;
        const onDown = (e: MouseEvent) => {
            if (!inviteRef.current?.contains(e.target as Node)) setShowInvite(false);
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowInvite(false); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [showInvite]);

    const copyInvite = async () => {
        if (!workspace?.inviteCode) return;
        try {
            await navigator.clipboard.writeText(workspace.inviteCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {/* clipboard blocked */}
    };

    const submitChannel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newChannel.trim()) return;
        setCreateError(null);
        try {
            await onCreateChannel(newChannel.trim());
            setNewChannel('');
            setCreating(false);
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : 'Could not create channel');
        }
    };

    return (
        <aside className="flex h-full w-[260px] flex-col border-r border-line bg-panel">
            {/* Workspace header */}
            <div ref={inviteRef} className="relative flex h-14 shrink-0 items-center justify-between gap-2 border-b border-line px-3">
                <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-md px-1.5 py-1 hover:bg-elevated" title="DevChat home">
                    <LogoMark size={22} />
                    <span className="truncate text-sm font-semibold">{workspace?.name ?? 'Workspace'}</span>
                </Link>
                <div className="flex items-center">
                    {workspace?.inviteCode && (
                        <button
                            type="button"
                            onClick={() => setShowInvite((v) => !v)}
                            className="icon-btn"
                            aria-label="Invite people"
                            aria-expanded={showInvite}
                            title="Invite people"
                        >
                            <LinkIcon size={15} />
                        </button>
                    )}
                    {onClose && (
                        <button type="button" onClick={onClose} className="icon-btn md:hidden" aria-label="Close sidebar">
                            <XIcon size={16} />
                        </button>
                    )}
                </div>

                {showInvite && workspace?.inviteCode && (
                    <div className="animate-fade-in absolute left-3 right-3 top-[52px] z-20 rounded-xl border border-line-strong bg-surface p-3 shadow-2xl shadow-black/60">
                        <p className="text-[13px] font-medium">Invite people</p>
                        <p className="mt-0.5 text-xs text-fg-subtle">Share this code. They join from the sign-in screen.</p>
                        <button
                            type="button"
                            onClick={copyInvite}
                            className="mt-2.5 flex w-full items-center justify-between rounded-lg border border-line bg-bg px-3 py-2 font-mono text-[13px] hover:border-line-strong"
                        >
                            <span>{workspace.inviteCode}</span>
                            {copied ? <CheckIcon size={14} className="text-success" /> : <CopyIcon size={14} className="text-fg-subtle" />}
                        </button>
                    </div>
                )}
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
                <div className="mb-1 flex items-center justify-between px-2">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">Channels</span>
                    <button
                        type="button"
                        onClick={() => { setCreating((v) => !v); setCreateError(null); }}
                        className="icon-btn h-6 w-6"
                        aria-label="Create channel"
                        title="Create channel"
                    >
                        <PlusIcon size={14} />
                    </button>
                </div>

                {creating && (
                    <form onSubmit={submitChannel} className="mb-1 px-1">
                        <div className="flex items-center gap-1.5 rounded-md border border-line-strong bg-bg px-2 focus-within:border-accent">
                            <HashIcon size={14} className="text-fg-subtle" />
                            <input
                                autoFocus
                                value={newChannel}
                                onChange={(e) => setNewChannel(e.target.value)}
                                onKeyDown={(e) => e.key === 'Escape' && setCreating(false)}
                                placeholder="new-channel"
                                aria-label="New channel name"
                                className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-fg-subtle focus-visible:outline-none"
                            />
                        </div>
                        {createError && <p className="mt-1 px-1 text-xs text-danger">{createError}</p>}
                    </form>
                )}

                <ul className="space-y-px">
                    {channels.map((channel) => {
                        const active = activeChannel?.id === channel.id;
                        return (
                            <li key={channel.id}>
                                <button
                                    type="button"
                                    onClick={() => onSelectChannel(channel)}
                                    aria-current={active ? 'page' : undefined}
                                    className={`flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm transition-colors ${
                                        active ? 'bg-elevated font-medium text-fg' : 'text-fg-muted hover:bg-elevated/60 hover:text-fg'
                                    }`}
                                >
                                    <HashIcon size={15} className={active ? 'text-fg-muted' : 'text-fg-subtle'} />
                                    <span className="truncate">{channel.name}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>

                <div className="mb-1 mt-6 px-2 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
                    Online <span className="ml-1 normal-case tracking-normal">{onlineUsers.length}</span>
                </div>
                <ul className="space-y-px">
                    {onlineUsers.map((u) => (
                        <li key={u.id} className="flex h-8 items-center gap-2.5 px-2 text-sm text-fg-muted">
                            <span className="relative">
                                <Avatar name={u.displayName} seed={u.id} src={u.avatar} size={20} />
                                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-success ring-2 ring-panel" />
                            </span>
                            <span className="truncate">{u.displayName}{u.id === currentUser?.id && <span className="text-fg-subtle"> (you)</span>}</span>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="shrink-0 space-y-1 border-t border-line p-2">
                <button
                    type="button"
                    onClick={onOpenAISettings}
                    className="flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-sm text-fg-muted transition-colors hover:bg-elevated hover:text-fg"
                >
                    <KeyIcon size={15} />
                    <span className="flex-1 text-left">AI key</span>
                    <span className={`inline-flex items-center gap-1.5 text-xs ${hasOpenaiKey ? 'text-success' : 'text-fg-subtle'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${hasOpenaiKey ? 'bg-success' : 'bg-fg-subtle'}`} />
                        {hasOpenaiKey ? 'Connected' : 'Not set'}
                    </span>
                </button>

                <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
                    <Avatar name={currentUser?.displayName} seed={currentUser?.id} src={currentUser?.avatar} size={28} />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{currentUser?.displayName}</p>
                        {isDemo && <p className="text-[11px] text-fg-subtle">Guest · deleted after 24h</p>}
                    </div>
                    <button type="button" onClick={onLogout} className="icon-btn" aria-label="Sign out" title="Sign out">
                        <LogOutIcon size={15} />
                    </button>
                </div>
            </div>
        </aside>
    );
}
