'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleLogin } from '@react-oauth/google';
import api, { ApiError } from '@/lib/api';

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
            router.push(`/workspace/${data.workspace._id}`);
        } catch (err) {
            setError(err.message || 'Could not start demo');
            setDemoLoading(false);
        }
    };

    if (checkingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0F0F23]">
                <div className="skeleton w-[200px] h-10 rounded-lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col" style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(79,70,229,0.15) 0%, #0F0F23 70%)',
        }}>
            {/* Top nav */}
            <header className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#A855F7] flex items-center justify-center text-sm font-extrabold text-white shadow-[0_4px_16px_rgba(79,70,229,0.3)]">
                        {'</>'}
                    </div>
                    <span className="text-lg font-extrabold bg-gradient-to-r from-[#F9FAFB] to-[#A855F7] bg-clip-text text-transparent">DevChat</span>
                </div>
                <div className="text-[0.75rem] text-[#6B7280] hidden sm:block">
                    Real-time chat for developers
                </div>
            </header>

            {/* Hero */}
            <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pb-12">
                <div className="w-full max-w-5xl text-center mb-10 animate-fade-in">
                    <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight tracking-tight mb-4 bg-gradient-to-br from-white via-[#D8D4FF] to-[#A855F7] bg-clip-text text-transparent">
                        Stop alt-tabbing to ChatGPT.
                    </h1>
                    <p className="text-base sm:text-lg text-[#9CA3AF] max-w-2xl mx-auto leading-relaxed">
                        DevChat is a real-time chat platform built for developers. Share code with proper syntax highlighting, get AI explanations streamed in-line, and collaborate with your team without breaking flow.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-2 mt-5 text-[0.75rem] text-[#6B7280]">
                        <span className="px-2.5 py-1 rounded-full bg-[#1A1A3E] border border-[#2D2D5E]">⚡ Real-time WebSockets</span>
                        <span className="px-2.5 py-1 rounded-full bg-[#1A1A3E] border border-[#2D2D5E]">🎨 Syntax highlighted</span>
                        <span className="px-2.5 py-1 rounded-full bg-[#1A1A3E] border border-[#2D2D5E]">✨ GPT-4o streaming</span>
                        <span className="px-2.5 py-1 rounded-full bg-[#1A1A3E] border border-[#2D2D5E]">🔒 Google OAuth</span>
                    </div>

                    <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button
                            onClick={handleTryDemo}
                            disabled={demoLoading}
                            className="px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-wait"
                            style={{
                                background: 'linear-gradient(135deg, #4F46E5, #A855F7)',
                                boxShadow: '0 8px 32px rgba(79,70,229,0.35)',
                            }}
                        >
                            {demoLoading ? 'Loading demo…' : '🚀 Try the demo (no signup)'}
                        </button>
                        <a
                            href="#auth"
                            className="px-6 py-3 rounded-xl text-sm font-semibold text-[#D1D5DB] border border-[#2D2D5E] hover:border-[#3D3D6E] hover:text-white transition-colors"
                        >
                            Create an account
                        </a>
                    </div>
                    <p className="text-[0.7rem] text-[#6B7280] mt-3">
                        Demo workspace is pre-seeded with example code & AI explanations. No credit card, expires in 2 hours.
                    </p>
                </div>

                <div id="auth" className="w-full max-w-md">
                    <div className="animate-fade-in">
                        {/* Auth card */}
                        <div className="glass rounded-2xl p-7">
                            <div className="flex gap-1 mb-6 bg-[#13132E] rounded-[10px] p-1">
                                {['login', 'register'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => { setMode(tab); setError(''); }}
                                        className="flex-1 py-2.5 rounded-lg text-[0.85rem] font-semibold transition-all"
                                        style={{
                                            background: mode === tab ? '#4F46E5' : 'transparent',
                                            color: mode === tab ? '#fff' : '#9CA3AF',
                                        }}
                                    >
                                        {tab === 'login' ? 'Sign In' : 'Sign Up'}
                                    </button>
                                ))}
                            </div>

                            {error && (
                                <div className="px-4 py-2.5 rounded-md bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.3)] text-[#FCA5A5] text-[0.85rem] mb-4">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                {mode === 'register' && (
                                    <div className="mb-4">
                                        <label className="block text-[0.8rem] text-[#9CA3AF] mb-1.5 font-medium">Display Name</label>
                                        <input
                                            type="text" value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            placeholder="Your name" required style={inputStyle}
                                        />
                                    </div>
                                )}

                                <div className="mb-4">
                                    <label className="block text-[0.8rem] text-[#9CA3AF] mb-1.5 font-medium">Email</label>
                                    <input
                                        type="email" value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com" required style={inputStyle}
                                    />
                                </div>

                                <div className="mb-6">
                                    <label className="block text-[0.8rem] text-[#9CA3AF] mb-1.5 font-medium">Password</label>
                                    <input
                                        type="password" value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="At least 8 characters" required
                                        minLength={8} style={inputStyle}
                                    />
                                </div>

                                <button
                                    type="submit" disabled={loading}
                                    className="w-full py-3 rounded-[10px] text-[0.9rem] font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-wait hover:-translate-y-px"
                                    style={{
                                        background: loading ? '#3730A3' : 'linear-gradient(135deg, #4F46E5, #6366F1)',
                                        boxShadow: '0 4px 16px rgba(79,70,229,0.3)',
                                    }}
                                >
                                    {loading ? '…' : mode === 'login' ? 'Sign In' : 'Create Account'}
                                </button>

                                <div className="flex items-center my-5">
                                    <div className="flex-1 h-px bg-[#2D2D5E]" />
                                    <span className="px-4 text-[0.8rem] text-[#9CA3AF]">OR</span>
                                    <div className="flex-1 h-px bg-[#2D2D5E]" />
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

                        {/* Invite */}
                        <div className="glass rounded-2xl p-5 mt-4">
                            <p className="text-[0.8rem] text-[#9CA3AF] mb-2.5 text-center">Have an invite code?</p>
                            <form onSubmit={handleJoinWorkspace} className="flex gap-2">
                                <input
                                    type="text" value={inviteCode}
                                    onChange={(e) => setInviteCode(e.target.value)}
                                    placeholder="Paste invite code"
                                    style={{ ...inputStyle, flex: 1 }}
                                />
                                <button
                                    type="submit" disabled={loading || !inviteCode}
                                    className="px-4 py-2.5 rounded-[10px] text-[0.85rem] font-semibold border border-[#2D2D5E] text-[#A855F7] hover:border-[#A855F7] disabled:opacity-50 transition-colors"
                                >
                                    Join
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                <footer className="mt-12 text-[0.7rem] text-[#6B7280] text-center">
                    Built with Next.js, Socket.io, MongoDB, and OpenAI. MIT licensed.
                </footer>
            </main>
        </div>
    );
}
