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
        <div className="w-[260px] min-w-[260px] h-screen bg-[#12122A] border-r border-[#2D2D5E] flex flex-col overflow-hidden">
            <div className="px-4 py-5 border-b border-[#2D2D5E]">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-[#F9FAFB] truncate">
                        {workspace?.name || 'Workspace'}
                    </h2>
                    <button
                        onClick={() => setShowInvite((s) => !s)}
                        className="tooltip text-[#9CA3AF] hover:text-white text-base p-1 rounded transition-colors"
                        data-tooltip="Invite link"
                        aria-label="Show invite link"
                    >
                        🔗
                    </button>
                </div>
                {showInvite && workspace?.inviteCode && (
                    <div className="animate-fade-in mt-3 p-2.5 bg-[#1A1A3E] rounded-md text-[0.75rem]">
                        <span className="text-[#9CA3AF]">Invite code: </span>
                        <code
                            className="text-[#A855F7] font-['JetBrains_Mono',monospace] cursor-pointer hover:underline"
                            onClick={() => navigator.clipboard.writeText(workspace.inviteCode)}
                        >
                            {workspace.inviteCode}
                        </code>
                        <span className="text-[#6B7280] text-[0.65rem] block mt-1">Click to copy</span>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto py-4">
                <div className="flex items-center justify-between px-4 mb-2">
                    <span className="text-[0.7rem] font-bold text-[#6B7280] uppercase tracking-wider">Channels</span>
                    <button
                        onClick={() => setShowNewChannel((s) => !s)}
                        className="text-[#6B7280] hover:text-white text-lg leading-none px-1 py-0.5 rounded transition-colors"
                        aria-label="Create channel"
                    >
                        +
                    </button>
                </div>

                {showNewChannel && (
                    <form onSubmit={handleCreateChannel} className="animate-fade-in px-3 mb-2">
                        <input
                            type="text"
                            value={newChannelName}
                            onChange={(e) => setNewChannelName(e.target.value)}
                            placeholder="channel-name"
                            autoFocus
                            className="w-full px-2.5 py-1.5 rounded-md border border-[#3D3D6E] bg-[#13132E] text-[#F9FAFB] text-[0.8rem] outline-none focus:border-[#4F46E5]"
                            onKeyDown={(e) => e.key === 'Escape' && setShowNewChannel(false)}
                        />
                    </form>
                )}

                {channels.map((channel) => {
                    const isActive = activeChannel?._id === channel._id;
                    return (
                        <button
                            key={channel._id}
                            onClick={() => onSelectChannel(channel)}
                            className={`w-full flex items-center gap-2 px-4 py-1.5 text-[0.85rem] transition-all border-l-2
                                ${isActive
                                    ? 'bg-[rgba(79,70,229,0.15)] text-[#F9FAFB] border-l-[#4F46E5]'
                                    : 'text-[#9CA3AF] hover:bg-white/[0.03] hover:text-white border-l-transparent'}`}
                        >
                            <span className="text-[#6B7280] text-[0.9rem]">#</span>
                            <span className="truncate">{channel.name}</span>
                        </button>
                    );
                })}
            </div>

            <div className="border-t border-[#2D2D5E] px-4 py-3">
                <span className="text-[0.7rem] font-bold text-[#6B7280] uppercase tracking-wider">
                    Online — {onlineUsers.length}
                </span>
                <div className="mt-2 flex flex-col gap-1 max-h-[120px] overflow-y-auto">
                    {onlineUsers.map((u, i) => (
                        <div key={i} className="flex items-center gap-2 text-[0.8rem]">
                            <div className="w-2 h-2 rounded-full bg-[#16A34A] shadow-[0_0_6px_rgba(22,163,74,0.5)]" />
                            <span className="text-[#9CA3AF] truncate">{u.displayName}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="border-t border-[#2D2D5E] px-3 py-2.5">
                <button
                    onClick={onOpenAISettings}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[0.78rem] transition-colors
                        ${hasOpenaiKey
                            ? 'text-[#86EFAC] hover:bg-[rgba(22,163,74,0.1)]'
                            : 'text-[#F59E0B] hover:bg-[rgba(245,158,11,0.1)]'}`}
                    title="Configure your OpenAI key for AI explanations"
                >
                    <span>{hasOpenaiKey ? '✓' : '⚡'}</span>
                    <span className="flex-1 text-left">
                        {hasOpenaiKey ? 'AI Connected' : 'Add OpenAI key'}
                    </span>
                    <span className="text-[0.65rem] opacity-60">⚙</span>
                </button>
            </div>

            <div className="border-t border-[#2D2D5E] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4F46E5] to-[#A855F7] flex items-center justify-center text-[0.75rem] font-bold text-white flex-shrink-0">
                        {currentUser?.displayName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                        <div className="text-[0.8rem] font-semibold text-[#F9FAFB] truncate">
                            {currentUser?.displayName || 'User'}
                        </div>
                        <div className="text-[0.65rem] text-[#6B7280]">online</div>
                    </div>
                </div>
                <button
                    onClick={onLogout}
                    className="text-[#6B7280] hover:text-white text-sm p-1.5 rounded transition-colors"
                    title="Sign Out"
                    aria-label="Sign out"
                >
                    ⎋
                </button>
            </div>
        </div>
    );
}
