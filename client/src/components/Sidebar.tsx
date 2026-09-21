'use client';

import { useState } from 'react';
import { Workspace, Channel, OnlineUser, User } from '@/types';

export interface SidebarProps {
    workspace: Workspace | null;
    channels: Channel[];
    activeChannel: Channel | null;
    onSelectChannel: (channel: Channel) => void;
    onCreateChannel: (name: string) => void;
    onlineUsers: OnlineUser[];
    currentUser: User | null;
    onLogout: () => void;
    onOpenAISettings: () => void;
    hasOpenaiKey?: boolean;
    isDemo?: boolean;
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
}: SidebarProps) {
    const [showNewChannel, setShowNewChannel] = useState<boolean>(false);
    const [newChannelName, setNewChannelName] = useState<string>('');
    const [showInvite, setShowInvite] = useState<boolean>(false);

    const handleCreateChannel = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (newChannelName.trim()) {
            onCreateChannel(newChannelName.trim());
            setNewChannelName('');
            setShowNewChannel(false);
        }
    };

    return (
        <div className="w-[260px] min-w-[260px] h-screen bg-[#080809] border-r border-[#1f1f1f] flex flex-col justify-between select-none z-30 font-sans">
            {/* Top Workspace Header */}
            <div>
                <div className="px-4 py-3.5 border-b border-[#1f1f1f] bg-[#0a0a0c]">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 h-6 rounded-md bg-[#141414] border border-[#2e2e2e] flex items-center justify-center text-[11px] font-bold text-[#52a8ff] shrink-0">
                                D
                            </span>
                            <h2 className="text-xs font-semibold text-white truncate tracking-tight">
                                {workspace?.name || 'DevChat Workspace'}
                            </h2>
                        </div>
                        <button
                            onClick={() => setShowInvite((s) => !s)}
                            className="text-[#71717a] hover:text-white p-1 rounded hover:bg-[#141414] transition-colors"
                            title="Workspace Invite Code"
                            aria-label="Show invite code"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                            </svg>
                        </button>
                    </div>

                    {showInvite && workspace?.inviteCode && (
                        <div className="animate-fade-in mt-2.5 p-2.5 bg-[#0e0e10] border border-[#1f1f1f] rounded-lg text-xs">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-mono uppercase text-[#71717a]">Invite Code</span>
                                <span className="text-[9px] text-[#52a8ff]">Click to copy</span>
                            </div>
                            <code
                                className="text-white font-mono text-xs cursor-pointer block py-1 px-2 bg-black rounded border border-[#2e2e2e] text-center hover:border-[#52a8ff] transition-colors"
                                onClick={() => {
                                    if (workspace?.inviteCode) {
                                        navigator.clipboard.writeText(workspace.inviteCode);
                                    }
                                }}
                            >
                                {workspace.inviteCode}
                            </code>
                        </div>
                    )}
                </div>

                {/* Channels Navigation */}
                <div className="p-3">
                    <div className="flex items-center justify-between px-2 mb-2">
                        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#565656]">
                            Channels
                        </span>
                        <button
                            onClick={() => setShowNewChannel((s) => !s)}
                            className="text-[#71717a] hover:text-white p-0.5 rounded hover:bg-[#141414] transition-colors"
                            aria-label="Create channel"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                        </button>
                    </div>

                    {showNewChannel && (
                        <form onSubmit={handleCreateChannel} className="animate-fade-in px-1 mb-2">
                            <input
                                type="text"
                                value={newChannelName}
                                onChange={(e) => setNewChannelName(e.target.value)}
                                placeholder="new-channel"
                                autoFocus
                                className="w-full px-2.5 py-1.5 rounded-lg border border-[#2e2e2e] bg-[#0e0e10] text-white text-xs font-mono outline-none focus:border-[#52a8ff] transition-colors"
                                onKeyDown={(e) => e.key === 'Escape' && setShowNewChannel(false)}
                            />
                        </form>
                    )}

                    <div className="space-y-0.5 max-h-[260px] overflow-y-auto">
                        {channels.map((channel) => {
                            const isActive = activeChannel?._id === channel._id;
                            return (
                                <button
                                    key={channel._id}
                                    onClick={() => onSelectChannel(channel)}
                                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all text-left ${
                                        isActive
                                            ? 'bg-[#141414] text-white border border-[#2e2e2e]'
                                            : 'text-[#71717a] hover:text-white hover:bg-[#0e0e10]'
                                    }`}
                                >
                                    <span className={isActive ? 'text-[#52a8ff]' : 'text-[#565656]'}>#</span>
                                    <span className="truncate">{channel.name}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Online Members List */}
                    <div className="mt-6 px-2 mb-2">
                        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#565656]">
                            Online ({onlineUsers.length})
                        </span>
                    </div>
                    <div className="space-y-1.5 px-2 max-h-[160px] overflow-y-auto">
                        {onlineUsers.map((u, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-[#a1a1a1]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981]"></span>
                                <span className="truncate">{u.displayName}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Actions & User Profile */}
            <div className="p-3 border-t border-[#1f1f1f] bg-[#0a0a0c] space-y-2">
                {/* AI Settings Button */}
                <button
                    onClick={onOpenAISettings}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-mono border transition-colors ${
                        hasOpenaiKey
                            ? 'border-[#10b981]/30 bg-[#10b981]/5 text-[#10b981] hover:bg-[#10b981]/10'
                            : 'border-[#1f1f1f] bg-[#0e0e10] text-[#a1a1a1] hover:text-white hover:border-[#2e2e2e]'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${hasOpenaiKey ? 'bg-[#10b981]' : 'bg-[#f59e0b]'}`} />
                        <span>{hasOpenaiKey ? 'AI Key Active' : 'Configure AI Key'}</span>
                    </div>
                    <span className="text-[10px] text-[#71717a]">⚙</span>
                </button>

                {/* User Profile & Sign Out */}
                <div className="flex items-center justify-between px-1 pt-1">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-[#141414] border border-[#2e2e2e] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                            {currentUser?.displayName?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="text-xs font-medium text-white truncate">
                            {currentUser?.displayName || 'User'}
                        </span>
                    </div>
                    <button
                        onClick={onLogout}
                        className="text-[11px] font-mono text-[#71717a] hover:text-[#ef4444] transition-colors"
                        title="Sign Out"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
