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
        <div style={{
            width: 260,
            minWidth: 260,
            height: '100vh',
            background: '#12122A',
            borderRight: '1px solid #2D2D5E',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
        }}>
            {/* Workspace Header */}
            <div style={{
                padding: '1.25rem 1rem',
                borderBottom: '1px solid #2D2D5E',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: '#F9FAFB',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}>
                        {workspace?.name || 'Workspace'}
                    </h2>
                    <button
                        onClick={() => setShowInvite(!showInvite)}
                        className="tooltip"
                        data-tooltip="Invite link"
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#9CA3AF',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            padding: '0.25rem',
                            borderRadius: 6,
                            transition: 'color 0.2s',
                        }}
                        onMouseOver={(e) => (e.target.style.color = '#F9FAFB')}
                        onMouseOut={(e) => (e.target.style.color = '#9CA3AF')}
                    >
                        🔗
                    </button>
                </div>
                {showInvite && workspace?.inviteCode && (
                    <div className="animate-fade-in" style={{
                        marginTop: '0.75rem',
                        padding: '0.6rem 0.75rem',
                        background: '#1A1A3E',
                        borderRadius: 8,
                        fontSize: '0.75rem',
                    }}>
                        <span style={{ color: '#9CA3AF' }}>Invite code: </span>
                        <code style={{
                            color: '#A855F7',
                            fontFamily: 'JetBrains Mono, monospace',
                            cursor: 'pointer',
                        }}
                            onClick={() => navigator.clipboard.writeText(workspace.inviteCode)}
                        >
                            {workspace.inviteCode}
                        </code>
                        <span style={{ color: '#6B7280', fontSize: '0.65rem', display: 'block', marginTop: 4 }}>
                            Click to copy
                        </span>
                    </div>
                )}
            </div>

            {/* Channels Section */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 1rem',
                    marginBottom: '0.5rem',
                }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Channels
                    </span>
                    <button
                        onClick={() => setShowNewChannel(!showNewChannel)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#6B7280',
                            cursor: 'pointer',
                            fontSize: '1.1rem',
                            lineHeight: 1,
                            padding: '0.15rem 0.3rem',
                            borderRadius: 4,
                            transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => (e.target.style.color = '#F9FAFB')}
                        onMouseOut={(e) => (e.target.style.color = '#6B7280')}
                    >
                        +
                    </button>
                </div>

                {showNewChannel && (
                    <form onSubmit={handleCreateChannel} className="animate-fade-in" style={{ padding: '0 0.75rem', marginBottom: '0.5rem' }}>
                        <input
                            type="text"
                            value={newChannelName}
                            onChange={(e) => setNewChannelName(e.target.value)}
                            placeholder="channel-name"
                            autoFocus
                            style={{
                                width: '100%',
                                padding: '0.5rem 0.65rem',
                                borderRadius: 6,
                                border: '1px solid #3D3D6E',
                                background: '#13132E',
                                color: '#F9FAFB',
                                fontSize: '0.8rem',
                                fontFamily: 'Inter, sans-serif',
                                outline: 'none',
                            }}
                            onKeyDown={(e) => e.key === 'Escape' && setShowNewChannel(false)}
                        />
                    </form>
                )}

                {channels.map((channel) => (
                    <button
                        key={channel._id}
                        onClick={() => onSelectChannel(channel)}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.45rem 1rem',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontFamily: 'Inter, sans-serif',
                            transition: 'all 0.15s',
                            background: activeChannel?._id === channel._id
                                ? 'rgba(79, 70, 229, 0.15)'
                                : 'transparent',
                            color: activeChannel?._id === channel._id ? '#F9FAFB' : '#9CA3AF',
                            borderLeft: activeChannel?._id === channel._id
                                ? '2px solid #4F46E5'
                                : '2px solid transparent',
                        }}
                        onMouseOver={(e) => {
                            if (activeChannel?._id !== channel._id) {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                e.currentTarget.style.color = '#F9FAFB';
                            }
                        }}
                        onMouseOut={(e) => {
                            if (activeChannel?._id !== channel._id) {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = '#9CA3AF';
                            }
                        }}
                    >
                        <span style={{ color: '#6B7280', fontSize: '0.9rem' }}>#</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {channel.name}
                        </span>
                    </button>
                ))}
            </div>

            {/* Online Users */}
            <div style={{ borderTop: '1px solid #2D2D5E', padding: '0.75rem 1rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Online — {onlineUsers.length}
                </span>
                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: 120, overflowY: 'auto' }}>
                    {onlineUsers.map((u, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                            <div style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: '#16A34A',
                                boxShadow: '0 0 6px rgba(22, 163, 74, 0.5)',
                            }} />
                            <span style={{ color: '#9CA3AF' }}>{u.displayName}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Current User */}
            <div style={{
                borderTop: '1px solid #2D2D5E',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #4F46E5, #A855F7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#fff',
                    }}>
                        {currentUser?.displayName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#F9FAFB' }}>
                            {currentUser?.displayName || 'User'}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#6B7280' }}>online</div>
                    </div>
                </div>
                <button
                    onClick={onLogout}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#6B7280',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        padding: '0.25rem',
                        borderRadius: 6,
                    }}
                    title="Sign Out"
                >
                    ↩
                </button>
            </div>
        </div>
    );
}
