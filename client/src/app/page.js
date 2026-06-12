'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleLogin } from '@react-oauth/google';
import api, { ApiError } from '@/lib/api';

export default function Home() {
    const router = useRouter();
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [demoLoading, setDemoLoading] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('devchat_token');
        if (token) {
            api.token = token;
            api.getMe()
                .then((data) => {
                    if (data.workspaces && data.workspaces.length > 0) {
                        router.push(`/workspace/${data.workspaces[0]._id}`);
                    } else {
                        setCheckingAuth(false);
                    }
                })
                .catch(() => { api.clearToken(); setCheckingAuth(false); });
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
            if (err instanceof ApiError && err.code === 'EXISTING_PASSWORD_ACCOUNT') {
                setError('An account with this email exists. Sign in with email + password first.');
            } else {
                setError(err.message || 'Google login failed');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleError = () => setError('Google Login Failed');

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

    const handleTryDemo = async () => {
        setError('');
        setDemoLoading(true);
        try {
            const data = await api.startDemo();
            if (data.messages) {
                sessionStorage.setItem(
                    `devchat_demo_messages_${data.channel._id}`,
                    JSON.stringify(data.messages)
                );
            }
            router.push(`/workspace/${data.workspace._id}`);
        } catch (err) {
            setError(err.message || 'Could not start demo');
            setDemoLoading(false);
        }
    };

    if (checkingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0F0F23]">
                <div className="skeleton w-[200px] h-10 rounded-lg animate-pulse" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#0F0F23] relative overflow-hidden">
            {/* Ambient background glows */}
            <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[5%] w-[450px] h-[450px] rounded-full bg-accent-purple/10 blur-[120px] pointer-events-none" />

            {/* Top Navigation Bar */}
            <header className="px-8 py-5 flex items-center justify-between border-b border-border/30 bg-bg-dark/45 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center text-sm font-extrabold text-white shadow-[0_4px_20px_rgba(79,70,229,0.35)] transition-transform hover:rotate-3 duration-300">
                        {'</>'}
                    </div>
                    <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-[#F9FAFB] to-[#D8D4FF] bg-clip-text text-transparent">
                        DevChat
                    </span>
                </div>
                <div className="text-xs font-semibold text-text-dim uppercase tracking-wider hidden sm:block">
                    Real-time chat built for developer flow
                </div>
            </header>

            {/* Content Container */}
            <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 z-10 max-w-5xl mx-auto w-full">
                {/* Hero Headers */}
                <div className="text-center mb-12 animate-fade-in">
                    <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight tracking-tight mb-5 bg-gradient-to-br from-white via-[#E0DCFF] to-accent-purple bg-clip-text text-transparent">
                        Stop alt-tabbing to ChatGPT.
                    </h1>
                    <p className="text-lg text-text-muted max-w-2xl mx-auto leading-relaxed">
                        DevChat embeds live code sharing and streaming AI explanations right inside your developer chat workflow. Collaborate in real time without breaking your IDE state.
                    </p>

                    {/* Features Badges */}
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-6 text-xs font-medium text-text-muted">
                        <span className="px-3 py-1.5 rounded-full bg-bg-surface/50 border border-border/50 backdrop-blur-sm shadow-sm">⚡ Socket.io WebSockets</span>
                        <span className="px-3 py-1.5 rounded-full bg-bg-surface/50 border border-border/50 backdrop-blur-sm shadow-sm">🎨 Monaco Editor Syntax</span>
                        <span className="px-3 py-1.5 rounded-full bg-bg-surface/50 border border-border/50 backdrop-blur-sm shadow-sm">✨ Streamed AI Explanations</span>
                        <span className="px-3 py-1.5 rounded-full bg-bg-surface/50 border border-border/50 backdrop-blur-sm shadow-sm">🔒 AES-256 Key Encryption</span>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={handleTryDemo}
                            disabled={demoLoading}
                            className="glow-btn px-7 py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 disabled:cursor-wait bg-gradient-to-r from-primary to-accent-purple shadow-[0_8px_32px_rgba(79,70,229,0.35)]"
                        >
                            {demoLoading ? 'Launching demo…' : '🚀 Try the demo (no signup)'}
                        </button>
                        <a
                            href="#auth"
                            className="px-7 py-3.5 rounded-xl text-sm font-bold text-text-primary border border-border hover:border-border-light hover:bg-white/[0.02] transition-all duration-200"
                        >
                            Create an account
                        </a>
                    </div>
                    <p className="text-[0.7rem] text-text-dim mt-4">
                        Demo workspace is pre-seeded with sample chats. No signup required. Expires in 2 hours.
                    </p>
                </div>

                {/* Forms Section */}
                <div id="auth" className="w-full max-w-md">
                    <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                        {/* Auth Card */}
                        <div className="glass-card rounded-2xl p-8 shadow-2xl">
                            {/* Tab switcher */}
                            <div className="flex gap-1 mb-6 bg-bg-input rounded-xl p-1.5 border border-border/40">
                                {['login', 'register'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => { setMode(tab); setError(''); }}
                                        className="flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 uppercase tracking-wider"
                                        style={{
                                            background: mode === tab ? 'var(--color-primary)' : 'transparent',
                                            color: mode === tab ? '#fff' : 'var(--color-text-muted)',
                                        }}
                                    >
                                        {tab === 'login' ? 'Sign In' : 'Sign Up'}
                                    </button>
                                ))}
                            </div>

                            {error && (
                                <div className="px-4 py-3 rounded-lg bg-danger/10 border border-danger/30 text-red-200 text-xs mb-4 animate-shake">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {mode === 'register' && (
                                    <div>
                                        <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Display Name</label>
                                        <input
                                            type="text" value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            placeholder="Your name" required 
                                            className="w-full px-4 py-3 rounded-xl border border-border bg-bg-input text-text-primary text-sm outline-none focus:border-primary transition-all duration-200 placeholder:text-text-dim"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Email</label>
                                    <input
                                        type="email" value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com" required 
                                        className="w-full px-4 py-3 rounded-xl border border-border bg-bg-input text-text-primary text-sm outline-none focus:border-primary transition-all duration-200 placeholder:text-text-dim"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Password</label>
                                    <input
                                        type="password" value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Minimum 8 characters" required
                                        minLength={8} 
                                        className="w-full px-4 py-3 rounded-xl border border-border bg-bg-input text-text-primary text-sm outline-none focus:border-primary transition-all duration-200 placeholder:text-text-dim"
                                    />
                                </div>

                                <button
                                    type="submit" disabled={loading}
                                    className="glow-btn w-full py-3 rounded-xl text-sm font-semibold text-white transition-all bg-gradient-to-r from-primary to-primary-light disabled:opacity-50 disabled:cursor-wait"
                                >
                                    {loading ? 'Processing…' : mode === 'login' ? 'Sign In' : 'Create Account'}
                                </button>

                                <div className="flex items-center my-6">
                                    <div className="flex-1 h-px bg-border/40" />
                                    <span className="px-4 text-xs font-semibold text-text-dim tracking-widest uppercase">OR</span>
                                    <div className="flex-1 h-px bg-border/40" />
                                </div>

                                <div className="flex justify-center">
                                    <GoogleLogin
                                        onSuccess={handleGoogleSuccess}
                                        onError={handleGoogleError}
                                        theme="filled_black" shape="pill"
                                        text={mode === 'login' ? 'signin_with' : 'signup_with'}
                                    />
                                </div>
                            </form>
                        </div>

                        {/* Invite Form */}
                        <div className="glass-card rounded-2xl p-6 mt-4 shadow-lg border border-border/30">
                            <p className="text-xs font-bold text-text-muted mb-3 text-center uppercase tracking-wider">Have an invite code?</p>
                            <form onSubmit={handleJoinWorkspace} className="flex gap-2">
                                <input
                                    type="text" value={inviteCode}
                                    onChange={(e) => setInviteCode(e.target.value)}
                                    placeholder="Paste invite code"
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-bg-input text-text-primary text-xs outline-none focus:border-primary transition-all duration-200 placeholder:text-text-dim"
                                />
                                <button
                                    type="submit" disabled={loading || !inviteCode}
                                    className="px-5 py-2.5 rounded-xl text-xs font-bold border border-border-light text-[#A855F7] hover:border-[#A855F7] hover:bg-accent-purple/5 disabled:opacity-50 transition-all duration-200"
                                >
                                    Join
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="mt-16 text-[0.7rem] text-text-dim text-center">
                    Built with Next.js, WebSockets, MongoDB, and OpenAI.
                </footer>
            </main>
        </div>
    );
}
