'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleLogin } from '@react-oauth/google';
import api from '@/lib/api';

export default function Home() {
    const router = useRouter();
    const [mode, setMode] = useState('login'); // 'login' | 'register' | 'join'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('devchat_token');
        if (token) {
            api.token = token;
            api.getMe()
                .then((data) => {
                    if (data.workspaces && data.workspaces.length > 0) {
                        router.push(`/workspace/${data.workspaces[0]._id}`);
                    }
                })
                .catch(() => {
                    api.clearToken();
                    setCheckingAuth(false);
                });
        } else {
            setCheckingAuth(false);
        }
    }, [router]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (mode === 'register') {
                const data = await api.register(email, password, displayName);
                router.push(`/workspace/${data.workspace._id}`);
            } else if (mode === 'login') {
                const data = await api.login(email, password);
                if (data.workspaces && data.workspaces.length > 0) {
                    router.push(`/workspace/${data.workspaces[0]._id}`);
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        setError('');
        setLoading(true);
        try {
            const data = await api.googleLogin(credentialResponse.credential);
            if (data.workspaces && data.workspaces.length > 0) {
                router.push(`/workspace/${data.workspaces[0]._id}`);
            } else if (data.workspace) {
                router.push(`/workspace/${data.workspace._id}`);
            }
        } catch (err) {
            setError(err.message || 'Google login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleError = () => {
        setError('Google Login Failed');
    };

    const handleJoinWorkspace = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await api.joinWorkspace(inviteCode);
            router.push(`/workspace/${data._id}`);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (checkingAuth) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0F0F23',
            }}>
                <div className="skeleton" style={{ width: 200, height: 40, borderRadius: 8 }} />
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(ellipse at 50% 0%, rgba(79,70,229,0.15) 0%, #0F0F23 70%)',
            padding: '2rem',
        }}>
            <div className="animate-fade-in" style={{
                width: '100%',
                maxWidth: 420,
            }}>
                {/* Logo & Branding */}
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 56,
                        height: 56,
                        borderRadius: 16,
                        background: 'linear-gradient(135deg, #4F46E5, #A855F7)',
                        marginBottom: '1rem',
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        color: '#fff',
                        boxShadow: '0 8px 32px rgba(79, 70, 229, 0.3)',
                    }}>
                        {'</>'}
                    </div>
                    <h1 style={{
                        fontSize: '2rem',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #F9FAFB, #A855F7)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '0.5rem',
                    }}>
                        DevChat
                    </h1>
                    <p style={{ color: '#9CA3AF', fontSize: '0.95rem' }}>
                        Real-time chat built for developers
                    </p>
                </div>

                {/* Auth Card */}
                <div className="glass" style={{
                    borderRadius: 16,
                    padding: '2rem',
                }}>
                    {/* Tab Switcher */}
                    <div style={{
                        display: 'flex',
                        gap: '0.25rem',
                        marginBottom: '1.75rem',
                        background: '#13132E',
                        borderRadius: 10,
                        padding: 4,
                    }}>
                        {['login', 'register'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => { setMode(tab); setError(''); }}
                                style={{
                                    flex: 1,
                                    padding: '0.6rem',
                                    borderRadius: 8,
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    fontFamily: 'Inter, sans-serif',
                                    transition: 'all 0.2s',
                                    background: mode === tab ? '#4F46E5' : 'transparent',
                                    color: mode === tab ? '#fff' : '#9CA3AF',
                                }}
                            >
                                {tab === 'login' ? 'Sign In' : 'Sign Up'}
                            </button>
                        ))}
                    </div>

                    {error && (
                        <div style={{
                            padding: '0.75rem 1rem',
                            borderRadius: 8,
                            background: 'rgba(220, 38, 38, 0.1)',
                            border: '1px solid rgba(220, 38, 38, 0.3)',
                            color: '#FCA5A5',
                            fontSize: '0.85rem',
                            marginBottom: '1rem',
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {mode === 'register' && (
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: '#9CA3AF', marginBottom: 6, fontWeight: 500 }}>
                                    Display Name
                                </label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="Your name"
                                    required
                                    style={inputStyle}
                                />
                            </div>
                        )}

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#9CA3AF', marginBottom: 6, fontWeight: 500 }}>
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                style={inputStyle}
                            />
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#9CA3AF', marginBottom: 6, fontWeight: 500 }}>
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={6}
                                style={inputStyle}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: 10,
                                border: 'none',
                                cursor: loading ? 'wait' : 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                fontFamily: 'Inter, sans-serif',
                                background: loading ? '#3730A3' : 'linear-gradient(135deg, #4F46E5, #6366F1)',
                                color: '#fff',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 16px rgba(79, 70, 229, 0.3)',
                            }}
                            onMouseOver={(e) => !loading && (e.target.style.transform = 'translateY(-1px)')}
                            onMouseOut={(e) => (e.target.style.transform = 'translateY(0)')}
                        >
                            {loading ? '...' : mode === 'login' ? 'Sign In' : 'Create Account'}
                        </button>
                        
                        <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0' }}>
                            <div style={{ flex: 1, height: 1, background: '#2D2D5E' }} />
                            <span style={{ padding: '0 1rem', fontSize: '0.8rem', color: '#9CA3AF' }}>OR</span>
                            <div style={{ flex: 1, height: 1, background: '#2D2D5E' }} />
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={handleGoogleError}
                                theme="filled_black"
                                shape="pill"
                                text={mode === 'login' ? 'signin_with' : 'signup_with'}
                            />
                        </div>
                    </form>
                </div>

                {/* Join Workspace Section */}
                <div className="glass" style={{
                    borderRadius: 16,
                    padding: '1.5rem',
                    marginTop: '1rem',
                }}>
                    <p style={{ fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '0.75rem', textAlign: 'center' }}>
                        Have an invite code?
                    </p>
                    <form onSubmit={handleJoinWorkspace} style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value)}
                            placeholder="Paste invite code"
                            style={{ ...inputStyle, flex: 1 }}
                        />
                        <button
                            type="submit"
                            disabled={loading || !inviteCode}
                            style={{
                                padding: '0.65rem 1.25rem',
                                borderRadius: 10,
                                border: '1px solid #2D2D5E',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                fontFamily: 'Inter, sans-serif',
                                background: 'transparent',
                                color: '#A855F7',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            Join
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

const inputStyle = {
    width: '100%',
    padding: '0.7rem 1rem',
    borderRadius: 10,
    border: '1px solid #2D2D5E',
    background: '#13132E',
    color: '#F9FAFB',
    fontSize: '0.9rem',
    fontFamily: 'Inter, sans-serif',
    outline: 'none',
    transition: 'border-color 0.2s',
};
