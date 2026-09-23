'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import api, { ApiError } from '@/lib/api';

type AuthMode = 'login' | 'register' | 'invite';

export default function Home() {
    const router = useRouter();
    const [mode, setMode] = useState<AuthMode>('login');
    const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [displayName, setDisplayName] = useState<string>('');
    const [inviteCode, setInviteCode] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
    const [demoLoading, setDemoLoading] = useState<boolean>(false);

    // Interactive Preview Mock State
    const [activeMockChannel, setActiveMockChannel] = useState<string>('general');
    const [activeMockTab, setActiveMockTab] = useState<'chat' | 'ai' | 'findings'>('chat');
    const [mockExplaining, setMockExplaining] = useState<boolean>(false);
    const [mockExplanation, setMockExplanation] = useState<string | null>(null);
    const [mockCopied, setMockCopied] = useState<boolean>(false);
    const explainTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('devchat_token');
        if (token && token !== 'demo-guest-token') {
            api.token = token;
            api.getMe()
                .then((data) => {
                    if (data.workspaces && data.workspaces.length > 0) {
                        router.push(`/workspace/${data.workspaces[0]._id}`);
                    } else {
                        setCheckingAuth(false);
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

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore keyboard shortcuts when typing in inputs or when modal is open
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                if (e.key === 'Escape') setAuthModalOpen(false);
                return;
            }

            if (e.key === 'Escape') {
                setAuthModalOpen(false);
            } else if ((e.key === 'd' || e.key === 'D') && !authModalOpen) {
                e.preventDefault();
                handleTryDemo();
            } else if ((e.key === 'l' || e.key === 'L') && !authModalOpen) {
                e.preventDefault();
                setMode('login');
                setAuthModalOpen(true);
            } else if ((e.key === 'c' || e.key === 'C') && !authModalOpen) {
                e.preventDefault();
                setMode('register');
                setAuthModalOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [authModalOpen]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
        setError('');
        setLoading(true);
        try {
            if (!credentialResponse.credential) {
                throw new Error('Missing Google credential');
            }
            const data = await api.googleLogin(credentialResponse.credential);
            if (data.workspaces && data.workspaces.length > 0) {
                router.push(`/workspace/${data.workspaces[0]._id}`);
            } else if (data.workspace) {
                router.push(`/workspace/${data.workspace._id}`);
            }
        } catch (err: any) {
            if (err instanceof ApiError && err.code === 'EXISTING_PASSWORD_ACCOUNT') {
                setError('An account with this email exists. Sign in with password first.');
            } else {
                setError(err.message || 'Google login failed');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleError = () => setError('Google Login Failed');

    const handleJoinWorkspace = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await api.joinWorkspace(inviteCode);
            router.push(`/workspace/${data._id}`);
        } catch (err: any) {
            setError(err.message || 'Invalid invite code');
        } finally {
            setLoading(false);
        }
    };

    const handleTryDemo = async () => {
        setError('');
        setDemoLoading(true);

        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 4000)
        );

        try {
            const data = await Promise.race([api.startDemo(), timeoutPromise]);
            if (data && data.workspace && data.workspace._id) {
                if (data.messages) {
                    sessionStorage.setItem(
                        `devchat_demo_messages_${data.channel._id}`,
                        JSON.stringify(data.messages)
                    );
                }
                router.push(`/workspace/${data.workspace._id}`);
                return;
            }
            throw new Error('Fallback required');
        } catch (err) {
            localStorage.setItem('devchat_token', 'demo-guest-token');
            localStorage.setItem('devchat_demo_mode', 'true');
            router.push('/workspace/demo-workspace');
        }
    };

    const triggerMockExplain = () => {
        if (mockExplanation) {
            setMockExplanation(null);
            return;
        }
        setMockExplaining(true);
        setMockExplanation('');

        const fullText = "This Rust struct implements a token-bucket rate limiter. Key observations:\n\n1. Atomic Operations: Replacing Mutex<usize> with AtomicUsize reduces lock contention under high concurrency.\n2. Monotonic Clock: Using Instant::now() avoids wall-clock drift issues during NTP adjustments.\n3. Latency: Refill calculation executes in <15ns per request.";
        let currentIdx = 0;

        if (explainTimerRef.current) clearInterval(explainTimerRef.current);
        explainTimerRef.current = setInterval(() => {
            currentIdx += 4;
            if (currentIdx >= fullText.length) {
                setMockExplanation(fullText);
                setMockExplaining(false);
                if (explainTimerRef.current) clearInterval(explainTimerRef.current);
            } else {
                setMockExplanation(fullText.slice(0, currentIdx));
            }
        }, 30);
    };

    const handleCopyMockCode = () => {
        navigator.clipboard.writeText(`pub struct TokenBucket {\n    capacity: usize,\n    available: usize,\n    refill_rate: Duration,\n    last_refill: Instant,\n}`);
        setMockCopied(true);
        setTimeout(() => setMockCopied(false), 2000);
    };

    if (checkingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="skeleton w-[180px] h-8 rounded-lg animate-pulse" />
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen flex flex-col items-center bg-black text-[#ededed] relative overflow-x-hidden selection:bg-[#52a8ff]/25 selection:text-white">
            {/* Background Grid */}
            <div className="pointer-events-none fixed inset-0 -z-10 grid-bg opacity-60"></div>

            {/* Navigation Bar (Interfere Minimalist Style) */}
            <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-black/80 backdrop-blur-md">
                <div className="max-w-7xl w-full mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
                    {/* Brand Wordmark + Version */}
                    <div className="flex items-center gap-3">
                        <a href="#" className="flex items-center gap-2.5 group">
                            <span className="w-7 h-7 rounded-lg bg-[#141414] border border-[#2e2e2e] flex items-center justify-center text-[#52a8ff] text-xs font-mono font-bold group-hover:border-[#52a8ff]/40 transition-colors shadow-[0_0_12px_rgba(82,168,255,0.15)]">
                                &lt;/&gt;
                            </span>
                            <span className="font-semibold text-sm tracking-tight text-white flex items-center">
                                DevChat<span className="text-[#52a8ff]">.</span>
                            </span>
                        </a>
                        <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border border-white/[0.08] bg-white/[0.03] text-[#a1a1aa]">
                            v2.4
                        </span>
                    </div>

                    {/* Center Navigation Links */}
                    <nav className="hidden md:flex items-center gap-7 text-xs font-normal text-[#a1a1aa]">
                        <a href="#preview" className="hover:text-white transition-colors">Workspace</a>
                        <a href="#features" className="hover:text-white transition-colors">Features</a>
                        <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
                        <a href="https://github.com/shihabcodes/DevChat" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Docs</a>
                    </nav>

                    {/* Right Actions with Keyboard Badges */}
                    <div className="flex items-center gap-3">
                        <a
                            href="https://github.com/shihabcodes/DevChat"
                            target="_blank"
                            rel="noreferrer"
                            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#27272a] bg-[#0c0c0e] hover:bg-[#141416] hover:border-[#3f3f46] text-[#a1a1aa] hover:text-white text-xs font-mono transition-all"
                        >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                            </svg>
                            <span>Star</span>
                            <span className="px-1.5 py-0.2 rounded-full bg-[#1c1c1f] text-[10px] text-white font-mono">142</span>
                        </a>

                        <button
                            onClick={() => { setMode('login'); setAuthModalOpen(true); }}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#a1a1aa] hover:text-white transition-colors px-2.5 py-1.5"
                        >
                            <span>Login</span>
                            <kbd className="int-kbd hidden sm:inline-flex">L</kbd>
                        </button>

                        <button
                            onClick={handleTryDemo}
                            disabled={demoLoading}
                            className="cta-primary inline-flex items-center gap-1.5 px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold disabled:opacity-60"
                        >
                            <span>{demoLoading ? 'Launching…' : 'Try Demo'}</span>
                            <kbd className="int-kbd bg-black/15 text-black hidden sm:inline-flex">D</kbd>
                            <span>→</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* HERO SECTION (Interfere 2-Column Editorial Layout) */}
            <section className="w-full max-w-7xl mx-auto px-4 sm:px-8 pt-16 sm:pt-24 pb-28 sm:pb-36 relative">
                {/* Top Row: Headline on Left, Subtitle & CTAs on Right */}
                <div className="flex flex-col lg:flex-row items-start justify-between gap-8 lg:gap-14 mb-14 sm:mb-20">
                    {/* Left Column: Editorial Headline */}
                    <div className="flex-1 max-w-2xl">
                        {/* Status Pill */}
                        <div className="spark-badge inline-flex items-center gap-2 h-7 px-3.5 rounded-full text-xs font-mono text-white mb-5 cursor-default">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981] animate-pulse"></span>
                            <span className="font-medium tracking-wide text-white">DEVCHAT 2.0</span>
                            <span className="text-[#71717a]">·</span>
                            <span className="text-[#a1a1aa]">IN-LINE AI MESSENGER</span>
                        </div>

                        {/* Editorial Typography: Modern Sans + Italic Serif (2 Clean Lines) */}
                        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-medium tracking-tight text-white leading-[1.06]">
                            Developer chat that<br className="hidden sm:block" />
                            never{' '}
                            <span className="font-editorial italic font-normal text-white text-[1.14em]">
                                loses flow.
                            </span>
                        </h1>
                    </div>

                    {/* Right Column: Narrative Subtitle & Dual Action Buttons (Left-Aligned within Column) */}
                    <div className="flex flex-col items-start justify-between gap-6 max-w-md pt-2 lg:pt-8">
                        <p className="text-base sm:text-lg text-[#a1a1aa] leading-relaxed font-normal">
                            DevChat empowers engineers with in-line AI intelligence, sub-50ms channels, and syntax-highlighted code execution without leaving the flow.
                        </p>

                        <div className="flex flex-wrap items-center gap-3.5">
                            <button
                                onClick={handleTryDemo}
                                disabled={demoLoading}
                                className="cta-primary h-11 px-6 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
                            >
                                <span>{demoLoading ? 'Launching…' : 'Try Live Demo'}</span>
                                <kbd className="int-kbd bg-black/15 text-black">D</kbd>
                                <span>→</span>
                            </button>

                            <button
                                onClick={() => { setMode('register'); setAuthModalOpen(true); }}
                                className="cta-secondary h-11 px-6 rounded-full text-xs sm:text-sm font-medium flex items-center gap-2"
                            >
                                <span>Create Account</span>
                                <kbd className="int-kbd">C</kbd>
                            </button>
                        </div>
                    </div>
                </div>

                {/* PRODUCT UI MOCKUP WINDOW (Interfere Centerpiece with Sunset Aurora Glow) */}
                <div id="preview" className="relative w-full mt-4 sm:mt-8">
                    {/* Interfere Signature Multi-Hue Sunset Aurora Glow */}
                    <div className="aurora-glow"></div>

                    {/* Floating Product Container */}
                    <div className="relative w-full rounded-2xl interfere-window bg-[#09090b]/95 backdrop-blur-2xl border border-white/[0.09] overflow-hidden">
                        {/* Top Window Bar with Traffic Lights & Interfere Tabs */}
                        <div className="px-5 py-3.5 bg-[#111114] border-b border-white/[0.08] flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <span className="w-3 h-3 rounded-full bg-[#ff5f56]/90 shadow-[0_0_6px_#ff5f56]/40 shrink-0"></span>
                                <span className="w-3 h-3 rounded-full bg-[#ffbd2e]/90 shadow-[0_0_6px_#ffbd2e]/40 shrink-0"></span>
                                <span className="w-3 h-3 rounded-full bg-[#27c93f]/90 shadow-[0_0_6px_#27c93f]/40 shrink-0"></span>
                                <span className="text-xs font-mono text-[#8e8e93] ml-2 truncate hidden md:inline">
                                    devchat : #general / limiter.rs
                                </span>
                            </div>

                            {/* Center Tabs matching Interfere (Activity, Sessions, Findings) */}
                            <div className="flex items-center gap-1 bg-[#18181b] p-1 rounded-lg border border-white/[0.08] text-xs font-mono shrink-0">
                                <button
                                    onClick={() => setActiveMockTab('chat')}
                                    className={`px-3 py-1 rounded-md transition-all ${
                                        activeMockTab === 'chat'
                                            ? 'bg-[#27272a] text-white font-medium shadow-sm'
                                            : 'text-[#71717a] hover:text-[#d4d4d8]'
                                    }`}
                                >
                                    Chat &amp; Code
                                </button>
                                <button
                                    onClick={() => {
                                        setActiveMockTab('ai');
                                        if (!mockExplanation) triggerMockExplain();
                                    }}
                                    className={`px-3 py-1 rounded-md transition-all ${
                                        activeMockTab === 'ai'
                                            ? 'bg-[#27272a] text-white font-medium shadow-sm'
                                            : 'text-[#71717a] hover:text-[#d4d4d8]'
                                    }`}
                                >
                                    AI Insights
                                </button>
                                <button
                                    onClick={() => setActiveMockTab('findings')}
                                    className={`px-3 py-1 rounded-md transition-all hidden sm:block ${
                                        activeMockTab === 'findings'
                                            ? 'bg-[#27272a] text-white font-medium shadow-sm'
                                            : 'text-[#71717a] hover:text-[#d4d4d8]'
                                    }`}
                                >
                                    Findings (3)
                                </button>
                            </div>

                            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#10b981]/10 border border-[#10b981]/25 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
                                <span className="text-[11px] font-mono text-[#10b981] font-medium hidden sm:inline">
                                    Sub-50ms
                                </span>
                            </div>
                        </div>

                        {/* Workspace Body */}
                        <div className="flex flex-col md:flex-row">
                            {/* Left Narrow Icon Strip (Interfere Style Rail) */}
                            <div className="hidden lg:flex w-12 border-r border-white/[0.06] bg-[#070708] py-4 flex-col items-center justify-between shrink-0">
                                <div className="space-y-4 flex flex-col items-center text-[#71717a]">
                                    <div className="w-7 h-7 rounded-lg bg-white/[0.08] text-[#ededed] flex items-center justify-center text-xs">
                                        💬
                                    </div>
                                    <div className="w-7 h-7 rounded-lg hover:bg-white/[0.04] text-[#71717a] hover:text-white flex items-center justify-center text-xs cursor-pointer transition-colors">
                                        ⚡
                                    </div>
                                    <div className="w-7 h-7 rounded-lg hover:bg-white/[0.04] text-[#71717a] hover:text-white flex items-center justify-center text-xs cursor-pointer transition-colors">
                                        📁
                                    </div>
                                    <div className="w-7 h-7 rounded-lg hover:bg-white/[0.04] text-[#71717a] hover:text-white flex items-center justify-center text-xs cursor-pointer transition-colors">
                                        ✨
                                    </div>
                                </div>
                                <div className="w-7 h-7 rounded-lg hover:bg-white/[0.04] text-[#71717a] hover:text-white flex items-center justify-center text-xs cursor-pointer transition-colors">
                                    ⚙️
                                </div>
                            </div>

                            {/* Middle Channels Sidebar */}
                            <div className="hidden md:block md:w-60 border-r border-white/[0.06] bg-[#09090b] p-4 space-y-6 shrink-0">
                                <div>
                                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#71717a] px-2 mb-2 font-semibold">
                                        Channels
                                    </div>
                                    <div className="space-y-1">
                                        {[
                                            { id: 'general', name: 'general', topic: 'team discussion' },
                                            { id: 'ai-codegen', name: 'ai-codegen', topic: 'LLM agents' },
                                            { id: 'architecture', name: 'architecture', topic: 'RFCs & design' }
                                        ].map((ch) => (
                                            <button
                                                key={ch.id}
                                                onClick={() => setActiveMockChannel(ch.id)}
                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono transition-all text-left ${
                                                    activeMockChannel === ch.id
                                                        ? 'bg-[#18181b] text-white border border-white/[0.08] font-medium shadow-sm'
                                                        : 'text-[#71717a] hover:text-[#ededed] hover:bg-[#121214]'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <span className="text-[#52a8ff] font-bold">#</span>
                                                    <span className="truncate">{ch.name}</span>
                                                </div>
                                                <span className="text-[9px] text-[#565656] hidden xl:inline">{ch.topic}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#71717a] px-2 mb-2 font-semibold">
                                        Team Members (3)
                                    </div>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex items-center justify-between px-2 py-1 rounded-md bg-white/[0.02] text-[#ededed]">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981]"></span>
                                                <span className="font-medium">Alex</span>
                                            </div>
                                            <span className="text-[10px] text-[#71717a] font-mono">Founding Eng</span>
                                        </div>
                                        <div className="flex items-center justify-between px-2 py-1 rounded-md text-[#ededed]">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981]"></span>
                                                <span className="font-medium">Sarah</span>
                                            </div>
                                            <span className="text-[10px] text-[#71717a] font-mono">Tech Lead</span>
                                        </div>
                                        <div className="flex items-center justify-between px-2 py-1 rounded-md text-[#ededed]">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981]"></span>
                                                <span className="font-medium">Shihab</span>
                                            </div>
                                            <span className="text-[10px] text-[#71717a] font-mono">AI Engineer</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-white/[0.06] text-xs font-mono text-[#52a8ff] flex items-center gap-2 px-1">
                                    <span className="w-2 h-2 rounded-full bg-[#52a8ff] shadow-[0_0_8px_#52a8ff] animate-pulse"></span>
                                    <span className="font-medium">GPT-4o-mini Active</span>
                                </div>
                            </div>

                            {/* Right Chat Feed */}
                            <div className="flex-1 bg-[#030304] p-5 sm:p-7 flex flex-col justify-between gap-6">
                                <div className="space-y-5">
                                    {/* Interfere Issue / Channel Subhead Bar */}
                                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[#52a8ff] font-bold">#</span>
                                            <span className="font-semibold text-white">general</span>
                                            <span className="text-[#71717a]">·</span>
                                            <span className="text-[#a1a1aa] font-mono text-[11px]">Token-Bucket Rate Limiter Implementation</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.05] border border-white/[0.08] text-[#10b981]">
                                                ● Active
                                            </span>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.05] border border-white/[0.08] text-[#a1a1aa] hidden sm:inline">
                                                Assigned: Shihab
                                            </span>
                                        </div>
                                    </div>

                                    {/* Message 1 */}
                                    <div className="flex gap-3 sm:gap-3.5 items-start">
                                        <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#2e2e2e] flex items-center justify-center text-xs font-bold text-[#52a8ff] shrink-0 mt-0.5 shadow-sm">
                                            A
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 text-xs mb-1.5">
                                                <span className="font-semibold text-white">Alex</span>
                                                <span className="text-[10px] text-[#71717a] font-mono">10:42 AM</span>
                                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#18181b] text-[#52a8ff] font-mono">Rust Pro</span>
                                            </div>
                                            <p className="text-xs sm:text-sm text-[#a1a1a1] leading-relaxed mb-3">
                                                Token-bucket rate limiter for our WebSocket proxy:
                                            </p>

                                            {/* Code Snippet Box with Syntax Colors */}
                                            <div className="rounded-xl border border-white/[0.08] bg-[#0c0c0e] overflow-hidden shadow-lg">
                                                <div className="px-4 py-2 bg-[#141416] border-b border-white/[0.06] flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-mono text-[#52a8ff] uppercase font-bold tracking-wider">rust</span>
                                                        <span className="text-[10px] font-mono text-[#565656]">src/limiter.rs</span>
                                                    </div>
                                                    <div className="flex items-center gap-2.5">
                                                        <button
                                                            onClick={triggerMockExplain}
                                                            className="px-2.5 py-1 rounded-md text-[11px] font-mono font-medium bg-[#52a8ff]/10 text-[#52a8ff] hover:bg-[#52a8ff]/20 border border-[#52a8ff]/30 transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(82,168,255,0.15)]"
                                                        >
                                                            <span>✨</span>
                                                            <span>{mockExplaining ? 'Streaming…' : mockExplanation ? 'Hide AI' : 'Explain with AI'}</span>
                                                        </button>
                                                        <button
                                                            onClick={handleCopyMockCode}
                                                            className="text-[11px] font-mono text-[#71717a] hover:text-white transition-colors px-2 py-1 rounded hover:bg-[#1c1c1f]"
                                                        >
                                                            {mockCopied ? '✓ Copied' : 'Copy'}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="p-4 sm:p-5 font-mono text-xs sm:text-sm leading-relaxed overflow-x-auto flex gap-4 text-[#ededed]">
                                                    <div className="text-[#52525b] select-none text-right font-normal space-y-0.5 shrink-0">
                                                        <div>1</div>
                                                        <div>2</div>
                                                        <div>3</div>
                                                        <div>4</div>
                                                        <div>5</div>
                                                        <div>6</div>
                                                    </div>
                                                    <pre className="whitespace-pre font-normal flex-1">
                                                        <span className="text-[#f43f5e]">pub struct</span> <span className="text-[#38bdf8]">TokenBucket</span> &#123;{'\n'}
                                                        {'    '}<span className="text-[#e2e8f0]">capacity</span>: <span className="text-[#fbbf24]">usize</span>,{'\n'}
                                                        {'    '}<span className="text-[#e2e8f0]">available</span>: <span className="text-[#fbbf24]">usize</span>,{'\n'}
                                                        {'    '}<span className="text-[#e2e8f0]">refill_rate</span>: <span className="text-[#38bdf8]">Duration</span>,{'\n'}
                                                        {'    '}<span className="text-[#e2e8f0]">last_refill</span>: <span className="text-[#38bdf8]">Instant</span>,{'\n'}
                                                        &#125;
                                                    </pre>
                                                </div>
                                            </div>

                                            {/* Streamed AI Explanation Card */}
                                            {mockExplanation !== null && (
                                                <div className="mt-4 ai-card animate-fade-in text-xs font-mono text-[#d4d4d8] leading-relaxed shadow-lg">
                                                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#222226] text-[11px] text-[#52a8ff] uppercase tracking-wider font-semibold">
                                                        <div className="flex items-center gap-1.5">
                                                            <span>✨</span>
                                                            <span>In-Line AI Explanation</span>
                                                        </div>
                                                        <button onClick={() => setMockExplanation(null)} className="text-[#71717a] hover:text-white px-1">✕</button>
                                                    </div>
                                                    <div className="whitespace-pre-wrap leading-relaxed">
                                                        {mockExplanation}
                                                        {mockExplaining && <span className="inline-block w-2 h-4 bg-[#52a8ff] ml-1 animate-pulse"></span>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Message 2 */}
                                    <div className="flex gap-3 sm:gap-3.5 items-start">
                                        <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#2e2e2e] flex items-center justify-center text-xs font-bold text-[#10b981] shrink-0 mt-0.5 shadow-sm">
                                            S
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 text-xs mb-1">
                                                <span className="font-semibold text-white">Sarah</span>
                                                <span className="text-[10px] text-[#71717a] font-mono">10:43 AM</span>
                                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#18181b] text-[#10b981] font-mono">Benchmark</span>
                                            </div>
                                            <p className="text-xs sm:text-sm text-[#a1a1a1] leading-relaxed">
                                                Tested with 50k concurrent sockets. Latency is under 40ms.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Typing Indicator */}
                                    <div className="flex items-center gap-2 text-xs text-[#71717a] pl-11">
                                        <span>Alex is typing</span>
                                        <span className="flex gap-1">
                                            <span className="typing-dot"></span>
                                            <span className="typing-dot"></span>
                                            <span className="typing-dot"></span>
                                        </span>
                                    </div>
                                </div>

                                {/* Mock Input Bar */}
                                <div className="pt-4 border-t border-white/[0.06] flex items-center gap-3">
                                    <input
                                        type="text"
                                        readOnly
                                        value="Message #general..."
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-[#0e0e11] border border-white/[0.08] text-xs font-mono text-[#71717a] outline-none min-w-0"
                                    />
                                    <button
                                        onClick={handleTryDemo}
                                        className="cta-primary px-5 py-2.5 rounded-xl text-xs font-semibold shrink-0"
                                    >
                                        <span className="sm:hidden">Launch →</span>
                                        <span className="hidden sm:inline">Launch Full App →</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Feature Micro-Highlights Strip below Product Mockup */}
                <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-16 mb-8 text-xs font-mono text-[#a1a1aa] px-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.14] bg-[#111114]/90 backdrop-blur-md shadow-md hover:border-white/[0.25] transition-colors">
                        <span className="text-[#52a8ff] text-sm">⚡</span>
                        <span className="text-white font-medium">Sub-50ms</span>
                        <span className="text-[#a1a1aa]">WebSockets</span>
                    </div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.14] bg-[#111114]/90 backdrop-blur-md shadow-md hover:border-white/[0.25] transition-colors">
                        <span className="text-[#10b981] text-sm">✨</span>
                        <span className="text-white font-medium">In-Line</span>
                        <span className="text-[#a1a1aa]">AI Explanations</span>
                    </div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.14] bg-[#111114]/90 backdrop-blur-md shadow-md hover:border-white/[0.25] transition-colors">
                        <span className="text-[#38bdf8] text-sm">🎨</span>
                        <span className="text-white font-medium">VS Code</span>
                        <span className="text-[#a1a1aa]">Shiki Engine</span>
                    </div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.14] bg-[#111114]/90 backdrop-blur-md shadow-md hover:border-white/[0.25] transition-colors">
                        <span className="text-[#f59e0b] text-sm">🔒</span>
                        <span className="text-white font-medium">AES-256</span>
                        <span className="text-[#a1a1aa]">Encrypted</span>
                    </div>
                </div>
            </section>

            {/* FEATURES SECTION (Interfere Minimalist Bento Grid) */}
            <section id="features" className="w-full max-w-7xl mx-auto px-4 sm:px-8 pt-32 pb-32 border-t border-white/[0.08] relative">
                {/* Section Header */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#52a8ff] mb-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#52a8ff]"></span>
                        <span>ENGINEERED FOR TEAMS</span>
                    </div>
                    <h2 className="text-3xl sm:text-5xl md:text-6xl font-medium tracking-tight text-white mb-4">
                        Everything developers need.{' '}
                        <span className="font-editorial italic font-normal text-[#ededed] text-[1.14em]">
                            Zero fluff.
                        </span>
                    </h2>
                    <p className="text-sm sm:text-base text-[#a1a1aa] leading-relaxed max-w-xl mx-auto font-normal">
                        Built from the ground up for high concurrency, low latency, and developer security.
                    </p>
                </div>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mx-auto mb-16">
                    <div className="yc-card p-7 sm:p-8 rounded-2xl border border-white/[0.08] bg-[#09090b]">
                        <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#2e2e2e] flex items-center justify-center text-[#52a8ff] text-base mb-4 shadow-[0_0_12px_rgba(82,168,255,0.15)]">
                            ⚡
                        </div>
                        <h3 className="text-base font-bold text-white mb-2">Sub-50ms WebSockets</h3>
                        <p className="text-xs sm:text-sm text-[#a1a1a1] leading-relaxed mb-4">
                            Built on Socket.io with Redis pub/sub backplane. Features optimistic message delivery and instant typing indicators across distributed server instances.
                        </p>
                        <div className="flex flex-wrap gap-2 text-[10px] font-mono text-[#71717a]">
                            <span className="px-2 py-0.5 rounded bg-[#141414] border border-[#27272a] text-[#ededed]">Socket.io 4.x</span>
                            <span className="px-2 py-0.5 rounded bg-[#141414] border border-[#27272a] text-[#ededed]">Redis Cluster</span>
                            <span className="px-2 py-0.5 rounded bg-[#141414] border border-[#27272a] text-[#10b981]">&lt;40ms Latency</span>
                        </div>
                    </div>

                    <div className="yc-card p-7 sm:p-8 rounded-2xl border border-white/[0.08] bg-[#09090b]">
                        <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#2e2e2e] flex items-center justify-center text-[#10b981] text-base mb-4 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                            ✨
                        </div>
                        <h3 className="text-base font-bold text-white mb-2">In-Line Streamed AI</h3>
                        <p className="text-xs sm:text-sm text-[#a1a1a1] leading-relaxed mb-4">
                            Click &quot;Explain&quot; on any code snippet to receive token-by-token GPT-4o-mini breakdowns directly in chat without context switching or leaving your flow.
                        </p>
                        <div className="flex flex-wrap gap-2 text-[10px] font-mono text-[#71717a]">
                            <span className="px-2 py-0.5 rounded bg-[#141414] border border-[#27272a] text-[#ededed]">GPT-4o-mini</span>
                            <span className="px-2 py-0.5 rounded bg-[#141414] border border-[#27272a] text-[#ededed]">SSE Streaming</span>
                            <span className="px-2 py-0.5 rounded bg-[#141414] border border-[#27272a] text-[#52a8ff]">Snippet Cache</span>
                        </div>
                    </div>

                    <div className="yc-card p-7 sm:p-8 rounded-2xl border border-white/[0.08] bg-[#09090b]">
                        <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#2e2e2e] flex items-center justify-center text-[#38bdf8] text-base mb-4 shadow-[0_0_12px_rgba(56,189,248,0.15)]">
                            🖥️
                        </div>
                        <h3 className="text-base font-bold text-white mb-2">VS Code-Grade Shiki</h3>
                        <p className="text-xs sm:text-sm text-[#a1a1a1] leading-relaxed mb-4">
                            Powered by Shiki syntax engine across 20+ languages including Rust, TypeScript, Python, and Go with Monaco editor integration for fast code sharing.
                        </p>
                        <div className="flex flex-wrap gap-2 text-[10px] font-mono text-[#71717a]">
                            <span className="px-2 py-0.5 rounded bg-[#141414] border border-[#27272a] text-[#ededed]">Shiki Engine</span>
                            <span className="px-2 py-0.5 rounded bg-[#141414] border border-[#27272a] text-[#ededed]">Monaco Editor</span>
                            <span className="px-2 py-0.5 rounded bg-[#141414] border border-[#27272a] text-[#ededed]">20+ Themes</span>
                        </div>
                    </div>

                    <div className="yc-card p-7 sm:p-8 rounded-2xl border border-white/[0.08] bg-[#09090b]">
                        <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#2e2e2e] flex items-center justify-center text-[#f59e0b] text-base mb-4 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                            🔒
                        </div>
                        <h3 className="text-base font-bold text-white mb-2">AES-256 Key Security</h3>
                        <p className="text-xs sm:text-sm text-[#a1a1a1] leading-relaxed mb-4">
                            Bring your own OpenAI API key encrypted at rest with AES-256-GCM, plus an instant guest sandbox that works out of the box with zero setup friction.
                        </p>
                        <div className="flex flex-wrap gap-2 text-[10px] font-mono text-[#71717a]">
                            <span className="px-2 py-0.5 rounded bg-[#141414] border border-[#27272a] text-[#ededed]">AES-256-GCM</span>
                            <span className="px-2 py-0.5 rounded bg-[#141414] border border-[#27272a] text-[#ededed]">BYO Key</span>
                            <span className="px-2 py-0.5 rounded bg-[#141414] border border-[#27272a] text-[#10b981]">Instant Guest</span>
                        </div>
                    </div>
                </div>

                {/* Architecture Specifications */}
                <div id="architecture" className="w-full mx-auto rounded-2xl border border-white/[0.08] bg-[#09090b] p-7 sm:p-8 mb-16 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
                        <div>
                            <div className="font-mono text-[11px] uppercase tracking-wider text-[#52a8ff] mb-1">
                                FULL-STACK SPECIFICATION
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-white">
                                High-Concurrency Real-Time Infrastructure
                            </h3>
                        </div>
                        <a
                            href="https://github.com/shihabcodes/DevChat"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#2e2e2e] bg-[#141414] hover:bg-[#1f1f1f] text-xs font-mono text-[#52a8ff] transition-colors self-start sm:self-auto"
                        >
                            <span>Inspect Source Code</span>
                            <span>↗</span>
                        </a>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6 font-mono text-xs">
                        <div className="space-y-1">
                            <div className="text-[#52a8ff] text-[10px] uppercase tracking-wider font-semibold">Frontend</div>
                            <div className="text-white font-medium text-sm">Next.js 15</div>
                            <div className="text-[#71717a] text-[11px]">React 19, Shiki</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-[#52a8ff] text-[10px] uppercase tracking-wider font-semibold">WebSockets</div>
                            <div className="text-white font-medium text-sm">Socket.io 4.x</div>
                            <div className="text-[#71717a] text-[11px]">Redis Pub/Sub</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-[#52a8ff] text-[10px] uppercase tracking-wider font-semibold">AI Streaming</div>
                            <div className="text-white font-medium text-sm">GPT-4o-mini</div>
                            <div className="text-[#71717a] text-[11px]">SSE Streaming</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-[#52a8ff] text-[10px] uppercase tracking-wider font-semibold">Datastore</div>
                            <div className="text-white font-medium text-sm">MongoDB 8.x</div>
                            <div className="text-[#71717a] text-[11px]">AES-256 encryption</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="w-full border-t border-white/[0.08] bg-black py-10">
                <div className="max-w-7xl w-full mx-auto px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs font-mono text-[#71717a]">
                    <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-md bg-[#141414] border border-[#2e2e2e] flex items-center justify-center text-[#52a8ff] text-xs font-bold">
                            &lt;/&gt;
                        </span>
                        <span className="text-[#ededed] font-medium">DevChat</span>
                        <span>·</span>
                        <span>shihabcodes/DevChat</span>
                    </div>
                    <div className="flex items-center gap-6 text-[#a1a1aa]">
                        <a href="https://github.com/shihabcodes/DevChat" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a>
                        <a href="https://shihabcodes.github.io" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Shihab Portfolio</a>
                        <a href="https://cal.com/shihabcodes/" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Book Intro</a>
                    </div>
                </div>
            </footer>

            {/* Auth Modal */}
            {authModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div
                        className="w-full max-w-md rounded-2xl border border-[#2e2e2e] bg-[#0c0c0e] p-6 sm:p-8 shadow-2xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setAuthModalOpen(false)}
                            className="absolute top-4 right-4 text-[#71717a] hover:text-white text-sm"
                            aria-label="Close"
                        >
                            ✕
                        </button>

                        <div className="mb-6">
                            <h3 className="text-base font-bold text-white">
                                {mode === 'login' ? 'Sign In to DevChat' : mode === 'register' ? 'Create an Account' : 'Join with Invite Code'}
                            </h3>
                            <p className="text-xs text-[#a1a1a1] mt-1">
                                {mode === 'login' ? 'Access your engineering workspaces' : mode === 'register' ? 'Start collaborating with your team' : 'Enter the code from your workspace admin'}
                            </p>
                        </div>

                        <div className="flex gap-1 mb-5 p-1 rounded-lg bg-[#141414] border border-[#1f1f1f]">
                            <button
                                onClick={() => { setMode('login'); setError(''); }}
                                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                    mode === 'login' ? 'bg-[#262626] text-white' : 'text-[#71717a] hover:text-white'
                                }`}
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => { setMode('register'); setError(''); }}
                                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                    mode === 'register' ? 'bg-[#262626] text-white' : 'text-[#71717a] hover:text-white'
                                }`}
                            >
                                Sign Up
                            </button>
                            <button
                                onClick={() => { setMode('invite'); setError(''); }}
                                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                    mode === 'invite' ? 'bg-[#262626] text-white' : 'text-[#71717a] hover:text-white'
                                }`}
                            >
                                Invite Code
                            </button>
                        </div>

                        {error && (
                            <div className="px-3.5 py-2.5 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#fca5a5] text-xs mb-4">
                                {error}
                            </div>
                        )}

                        {mode === 'invite' ? (
                            <form onSubmit={handleJoinWorkspace} className="space-y-4">
                                <div>
                                    <label className="block text-[11px] font-mono uppercase tracking-wider text-[#a1a1a1] mb-1.5">
                                        Invite Code
                                    </label>
                                    <input
                                        type="text"
                                        value={inviteCode}
                                        onChange={(e) => setInviteCode(e.target.value)}
                                        placeholder="paste-invite-code-here"
                                        required
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#2e2e2e] bg-[#141414] text-white text-xs font-mono outline-none focus:border-[#52a8ff] transition-all"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading || !inviteCode}
                                    className="w-full py-2.5 rounded-xl bg-[#52a8ff] text-black text-xs font-semibold hover:bg-[#60a5fa] transition-all disabled:opacity-50"
                                >
                                    {loading ? 'Joining…' : 'Join Workspace'}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {mode === 'register' && (
                                    <div>
                                        <label className="block text-[11px] font-mono uppercase tracking-wider text-[#a1a1a1] mb-1.5">
                                            Display Name
                                        </label>
                                        <input
                                            type="text"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            placeholder="Sarah Connor"
                                            required
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-[#2e2e2e] bg-[#141414] text-white text-xs outline-none focus:border-[#52a8ff] transition-all"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-[11px] font-mono uppercase tracking-wider text-[#a1a1a1] mb-1.5">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="developer@company.com"
                                        required
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#2e2e2e] bg-[#141414] text-white text-xs outline-none focus:border-[#52a8ff] transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-mono uppercase tracking-wider text-[#a1a1a1] mb-1.5">
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Minimum 8 characters"
                                        required
                                        minLength={8}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#2e2e2e] bg-[#141414] text-white text-xs outline-none focus:border-[#52a8ff] transition-all"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-2.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-[#e8e8e8] transition-all disabled:opacity-50"
                                >
                                    {loading ? 'Processing…' : mode === 'login' ? 'Sign In' : 'Create Account'}
                                </button>

                                <div className="flex items-center my-4">
                                    <div className="flex-1 h-px bg-[#1f1f1f]" />
                                    <span className="px-3 text-[10px] font-mono text-[#565656] uppercase">OR</span>
                                    <div className="flex-1 h-px bg-[#1f1f1f]" />
                                </div>

                                <div className="flex justify-center">
                                    <GoogleLogin
                                        onSuccess={handleGoogleSuccess}
                                        onError={handleGoogleError}
                                        theme="filled_black"
                                        shape="pill"
                                        text={mode === 'login' ? 'signin_with' : 'signup_with'}
                                    />
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
