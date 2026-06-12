'use client';

import { useState } from 'react';

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
}) {
    const [showNewChannel, setShowNewChannel] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');
    const [showInvite, setShowInvite] = useState(false);

    const handleCreateChannel = (e) => {
        e.preventDefault();
        if (newChannelName.trim()) {
            onCreateChannel(newChannelName.trim());
            setNewChannelName('');
            setShowNewChannel(false);
        }
    };

    return (
        <div className="w-[260px] min-w-[260px] h-screen bg-[#111126] border-r border-border/50 flex flex-col overflow-hidden select-none z-30">
            {/* Workspace Header */}
            <div className="px-5 py-4 border-b border-border/30 bg-[#0F0F23]/60 backdrop-blur-md">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-sm font-extrabold text-text-primary truncate uppercase tracking-wider">
                        {workspace?.name || 'Workspace'}
                    </h2>
                    <button
                        onClick={() => setShowInvite((s) => !s)}
                        className="tooltip text-text-muted hover:text-text-primary p-1.5 rounded-lg bg-bg-surface/30 hover:bg-bg-surface-hover/60 border border-border/20 transition-all"
                        data-tooltip="Invite link"
                        aria-label="Show invite link"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                        </svg>
                    </button>
                </div>
                {showInvite && workspace?.inviteCode && (
                    <div className="animate-fade-in mt-3 p-3 bg-bg-surface/50 border border-border/40 rounded-xl text-xs shadow-inner">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-text-dim text-[0.7rem] uppercase tracking-wider font-bold">Invite code</span>
                            <span className="text-[0.6rem] text-text-dim">Click to copy</span>
                        </div>
                        <code
                            className="text-accent-purple font-mono font-bold cursor-pointer hover:text-accent-purple/80 transition-colors block py-1.5 px-2 bg-bg-dark/50 rounded-lg text-center select-all border border-border/20"
                            onClick={() => navigator.clipboard.writeText(workspace.inviteCode)}
                        >
                            {workspace.inviteCode}
                        </code>
                    </div>
                )}
            </div>

            {/* Channels Navigation */}
            <div className="flex-1 overflow-y-auto py-5 px-3 space-y-1">
                <div className="flex items-center justify-between px-2 mb-3">
                    <span className="text-[0.68rem] font-bold text-text-dim uppercase tracking-widest">Channels</span>
                    <button
                        onClick={() => setShowNewChannel((s) => !s)}
                        className="text-text-dim hover:text-text-primary p-1 rounded-md hover:bg-bg-surface/40 transition-all"
                        aria-label="Create channel"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                    </button>
                </div>

                {showNewChannel && (
                    <form onSubmit={handleCreateChannel} className="animate-fade-in px-1 mb-3">
                        <input
                            type="text"
                            value={newChannelName}
                            onChange={(e) => setNewChannelName(e.target.value)}
                            placeholder="new-channel"
                            autoFocus
                            className="w-full px-3 py-2 rounded-xl border border-border/70 bg-bg-input text-text-primary text-xs outline-none focus:border-primary transition-all placeholder:text-text-dim"
                            onKeyDown={(e) => e.key === 'Escape' && setShowNewChannel(false)}
                        />
                    </form>
                )}

                <div className="space-y-0.5 max-h-[300px] overflow-y-auto pr-1">
                    {channels.map((channel) => {
                        const isActive = activeChannel?._id === channel._id;
                        return (
                            <button
                                key={channel._id}
                                onClick={() => onSelectChannel(channel)}
                                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative
                                    ${isActive
                                        ? 'bg-primary/15 text-text-primary border-l-2 border-primary pl-2.5'
                                        : 'text-text-muted hover:bg-white/[0.02] hover:text-text-primary border-l-2 border-transparent'}`}
                            >
                                <span className={`text-[1.1rem] transition-colors ${isActive ? 'text-primary' : 'text-text-dim group-hover:text-text-muted'}`}>#</span>
                                <span className="truncate">{channel.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Active Users Section */}
            <div className="border-t border-border/30 px-5 py-4 bg-[#0F0F23]/20">
                <span className="text-[0.68rem] font-bold text-text-dim uppercase tracking-widest block mb-3">
                    Online Members ({onlineUsers.length})
                </span>
                <div className="flex flex-col gap-2.5 max-h-[140px] overflow-y-auto pr-1">
                    {onlineUsers.map((u, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs animate-fade-in">
                            <div className="relative flex-shrink-0">
                                <div className="w-2.5 h-2.5 rounded-full bg-success border border-[#111126] shadow-[0_0_8px_rgba(22,163,74,0.4)] animate-pulse" />
                            </div>
                            <span className="text-text-muted truncate font-medium">{u.displayName}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* AI Settings Indicator Button */}
            <div className="border-t border-border/30 p-3 bg-[#0F0F23]/40">
                <button
                    onClick={onOpenAISettings}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-300 hover:scale-[1.01]
                        ${hasOpenaiKey
                            ? 'border-success/30 bg-success/5 text-success hover:bg-success/10'
                            : 'border-warning/30 bg-warning/5 text-warning hover:bg-warning/10'}`}
                >
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${hasOpenaiKey ? 'bg-success shadow-[0_0_8px_rgba(22,163,74,0.5)]' : 'bg-warning shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`} />
                        <span>{hasOpenaiKey ? 'AI Connected' : 'Add OpenAI key'}</span>
                    </div>
                    <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.936 6.936 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>
            </div>

            {/* User Profile Footer */}
            <div className="border-t border-border/30 px-5 py-4 bg-[#0F0F23]/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center text-xs font-extrabold text-white flex-shrink-0 shadow-md">
                        {currentUser?.displayName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                        <div className="text-xs font-bold text-text-primary truncate">
                            {currentUser?.displayName || 'User'}
                        </div>
                        <div className="text-[0.62rem] font-medium text-success uppercase tracking-wider">developer</div>
                    </div>
                </div>
                <button
                    onClick={onLogout}
                    className="text-text-dim hover:text-danger p-2 rounded-xl bg-bg-surface/20 hover:bg-danger/10 border border-border/10 hover:border-danger/20 transition-all"
                    title="Sign Out"
                    aria-label="Sign out"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M19.5 12l-3-3m3 3l-3 3m3-3H9" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
