'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleLogin } from '@react-oauth/google';
import api, { ApiError } from '@/lib/api';

export default function Home() {
    const router = useRouter();
    const [mode, setMode] = useState('login'); // 'login' | 'register' | 'invite'
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [demoLoading, setDemoLoading] = useState(false);

    // Interactive Preview Mock State
    const [activeMockChannel, setActiveMockChannel] = useState('general');
    const [mockExplaining, setMockExplaining] = useState(false);
    const [mockExplanation, setMockExplanation] = useState(null);
    const [mockCopied, setMockCopied] = useState(false);
    const explainTimerRef = useRef(null);

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
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setAuthModalOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

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
            setError(err.message || 'Authentication failed');
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
                setError('An account with this email exists. Sign in with password first.');
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
            setError(err.message || 'Invalid invite code');
        } finally {
            setLoading(false);
        }
    };

    const handleTryDemo = async () => {
        setError('');
        setDemoLoading(true);

        const timeoutPromise = new Promise((_, reject) =>
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
                clearInterval(explainTimerRef.current);
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
        <div className="min-h-screen flex flex-col bg-black text-[#ededed] relative overflow-x-hidden selection:bg-[#52a8ff]/25 selection:text-white">
            {/* Background Grid & Ambient Glow */}
            <div className="pointer-events-none fixed inset-0 -z-10 grid-bg opacity-70"></div>
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="hero-glow"></div>
            </div>

            {/* Navigation Bar */}
            <header className="sticky top-0 z-40 w-full border-b border-[#1f1f1f] bg-black/80 backdrop-blur-md">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
                    <a href="#" className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-[#141414] border border-[#2e2e2e] flex items-center justify-center text-[#52a8ff] text-xs font-mono font-bold">
                            &lt;/&gt;
                        </span>
                        <span className="font-semibold text-sm tracking-tight text-white">
                            DevChat<span className="text-[#52a8ff] ml-0.5">.</span>
                        </span>
                    </a>

                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <a
                            href="https://github.com/shihabcodes/DevChat"
                            target="_blank"
                            rel="noreferrer"
                            className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#2e2e2e] bg-[#0e0e0e] text-[#a1a1a1] hover:text-white text-xs font-mono transition-colors"
                        >
                            <span>★ Star on GitHub</span>
                        </a>

                        <button
                            onClick={() => { setMode('login'); setAuthModalOpen(true); }}
                            className="text-xs text-[#a1a1a1] hover:text-white transition-colors px-2 py-1.5"
                        >
                            Sign In
                        </button>

                        <button
                            onClick={handleTryDemo}
                            disabled={demoLoading}
                            className="inline-flex items-center gap-1 px-3.5 sm:px-4 py-1.5 rounded-full bg-white text-black text-xs font-semibold hover:bg-[#e4e4e7] transition-all disabled:opacity-60"
                        >
                            <span>{demoLoading ? 'Launching…' : 'Try Demo'}</span>
                            <span>→</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="flex-1 flex flex-col items-center pt-14 sm:pt-16 pb-16 sm:pb-20 px-4 sm:px-6 text-center max-w-5xl mx-auto w-full">
                {/* Status Pill */}
                <div className="inline-flex items-center gap-2 h-7 px-3.5 rounded-full border border-[#27272a] bg-white/[0.03] text-xs font-mono text-[#a1a1a1] mb-5 sm:mb-6">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981] animate-pulse"></span>
                    <span className="text-white font-medium">DEVCHAT 2.0</span>
                    <span className="text-[#565656]">·</span>
                    <span>IN-LINE AI MESSENGER</span>
                </div>

                {/* Hero Title */}
                <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.12] sm:leading-[1.1] max-w-3xl mb-4 px-2">
                    Real-time chat built for developer flow.
                </h1>

                {/* Hero Subtitle */}
                <p className="text-sm sm:text-base text-[#a1a1a1] leading-relaxed max-w-xl mx-auto mb-7 sm:mb-8 font-normal px-2">
                    Share syntax-highlighted code, stream in-line AI explanations, and collaborate in sub-50ms channels.
                </p>

                {/* Action Buttons (Responsive Column on Mobile, Row on Desktop) */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14 sm:mb-16 w-full sm:w-auto px-4">
                    <button
                        onClick={handleTryDemo}
                        disabled={demoLoading}
                        className="w-full sm:w-auto h-11 px-7 rounded-full bg-white text-black text-sm font-semibold hover:bg-neutral-200 transition-all shadow-[0_0_24px_rgba(255,255,255,0.15)] flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                        <span>{demoLoading ? 'Launching…' : 'Try Live Demo'}</span>
                        <span className="text-xs">→</span>
                    </button>
                    <button
                        onClick={() => { setMode('register'); setAuthModalOpen(true); }}
                        className="w-full sm:w-auto h-11 px-7 rounded-full border border-[#27272a] bg-[#121214] text-[#ededed] text-sm font-medium hover:border-[#3f3f46] hover:bg-[#18181b] transition-all flex items-center justify-center"
                    >
                        Create Account
                    </button>
                </div>

                {/* Interactive Product Preview Widget */}
                <section id="preview" className="w-full max-w-4xl text-left mb-16 sm:mb-24">
                    <div className="rounded-xl border border-[#27272a] bg-[#0c0c0e] shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden">
                        {/* Top Window Bar */}
                        <div className="px-4 py-3 bg-[#111114] border-b border-[#222226] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#2a2a2e]"></span>
                                <span className="w-2.5 h-2.5 rounded-full bg-[#2a2a2e]"></span>
                                <span className="w-2.5 h-2.5 rounded-full bg-[#2a2a2e]"></span>
                                <span className="text-xs font-mono text-[#8e8e93] ml-2">devchat / #general</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
                                <span className="text-[11px] font-mono text-[#10b981]">Sub-50ms</span>
                            </div>
                        </div>

                        {/* Workspace Body */}
                        <div className="flex flex-col md:flex-row">
                            {/* Left Sidebar (Hidden on small mobile screens to keep focus on code & chat) */}
                            <div className="hidden md:block md:w-52 border-r border-[#222226] bg-[#09090b] p-3.5 space-y-4 shrink-0">
                                <div>
                                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#71717a] px-2 mb-2 font-semibold">
                                        Channels
                                    </div>
                                    <div className="space-y-0.5">
                                        {[
                                            { id: 'general', name: 'general' },
                                            { id: 'ai-codegen', name: 'ai-codegen' },
                                            { id: 'architecture', name: 'architecture' }
                                        ].map((ch) => (
                                            <button
                                                key={ch.id}
                                                onClick={() => setActiveMockChannel(ch.id)}
                                                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-mono transition-all text-left ${
                                                    activeMockChannel === ch.id
                                                        ? 'bg-[#18181b] text-white border border-[#2e2e32] font-medium'
                                                        : 'text-[#71717a] hover:text-[#ededed]'
                                                }`}
                                            >
                                                <span className="text-[#52a8ff]">#</span>
                                                <span className="truncate">{ch.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#71717a] px-2 mb-2 font-semibold">
                                        Members (3)
                                    </div>
                                    <div className="space-y-1.5 text-xs">
                                        <div className="flex items-center gap-2 px-2 py-0.5 text-[#ededed]">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
                                            <span>Alex</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-2 py-0.5 text-[#ededed]">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
                                            <span>Sarah</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-2 py-0.5 text-[#ededed]">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
                                            <span>Shihab</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2.5 border-t border-[#1f1f1f] text-[11px] font-mono text-[#52a8ff] flex items-center gap-1.5 px-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#52a8ff]"></span>
                                    <span>GPT-4o-mini Active</span>
                                </div>
                            </div>

                            {/* Right Chat Feed */}
                            <div className="flex-1 bg-[#020202] p-4 sm:p-5 flex flex-col justify-between gap-4 sm:gap-5">
                                <div className="space-y-3.5 sm:space-y-4">
                                    {/* Message 1 */}
                                    <div className="flex gap-2.5 sm:gap-3 items-start">
                                        <div className="w-7 h-7 rounded-md bg-[#141414] border border-[#2e2e2e] flex items-center justify-center text-xs font-bold text-[#52a8ff] shrink-0 mt-0.5">
                                            A
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 text-xs mb-1">
                                                <span className="font-semibold text-white">Alex</span>
                                                <span className="text-[10px] text-[#71717a]">10:42 AM</span>
                                            </div>
                                            <p className="text-xs text-[#a1a1a1] leading-relaxed mb-2 sm:mb-2.5">
                                                Token-bucket rate limiter for our WebSocket proxy:
                                            </p>

                                            {/* Code Snippet Box with Syntax Colors */}
                                            <div className="rounded-lg border border-[#222226] bg-[#0c0c0e] overflow-hidden">
                                                <div className="px-3 py-1.5 bg-[#141416] border-b border-[#222226] flex items-center justify-between">
                                                    <span className="text-[10px] font-mono text-[#52a8ff] uppercase font-semibold">rust</span>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={triggerMockExplain}
                                                            className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#52a8ff]/10 text-[#52a8ff] hover:bg-[#52a8ff]/20 border border-[#52a8ff]/30 transition-all flex items-center gap-1"
                                                        >
                                                            <span>✨</span>
                                                            <span>{mockExplaining ? 'Streaming…' : mockExplanation ? 'Hide AI' : 'Explain with AI'}</span>
                                                        </button>
                                                        <button
                                                            onClick={handleCopyMockCode}
                                                            className="text-[10px] font-mono text-[#71717a] hover:text-white transition-colors"
                                                        >
                                                            {mockCopied ? 'Copied' : 'Copy'}
                                                        </button>
                                                    </div>
                                                </div>
                                                <pre className="p-3 sm:p-3.5 font-mono text-[11px] sm:text-xs leading-relaxed whitespace-pre font-normal text-[#ededed] overflow-x-auto">
                                                    <span className="text-[#f43f5e]">pub struct</span> <span className="text-[#38bdf8]">TokenBucket</span> &#123;{'\n'}
                                                    {'    '}<span className="text-[#e2e8f0]">capacity</span>: <span className="text-[#fbbf24]">usize</span>,{'\n'}
                                                    {'    '}<span className="text-[#e2e8f0]">available</span>: <span className="text-[#fbbf24]">usize</span>,{'\n'}
                                                    {'    '}<span className="text-[#e2e8f0]">refill_rate</span>: <span className="text-[#38bdf8]">Duration</span>,{'\n'}
                                                    {'    '}<span className="text-[#e2e8f0]">last_refill</span>: <span className="text-[#38bdf8]">Instant</span>,{'\n'}
                                                    &#125;
                                                </pre>
                                            </div>

                                            {/* Streamed AI Explanation Card */}
                                            {mockExplanation !== null && (
                                                <div className="mt-3 ai-card animate-fade-in text-xs font-mono text-[#d4d4d8] leading-relaxed">
                                                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#222226] text-[10px] text-[#52a8ff] uppercase tracking-wider">
                                                        <span>In-Line AI Explanation</span>
                                                        <button onClick={() => setMockExplanation(null)} className="text-[#71717a] hover:text-white">✕</button>
                                                    </div>
                                                    <div className="whitespace-pre-wrap">
                                                        {mockExplanation}
                                                        {mockExplaining && <span className="inline-block w-1.5 h-3.5 bg-[#52a8ff] ml-1 animate-pulse"></span>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Message 2 */}
                                    <div className="flex gap-2.5 sm:gap-3 items-start">
                                        <div className="w-7 h-7 rounded-md bg-[#141414] border border-[#2e2e2e] flex items-center justify-center text-xs font-bold text-[#10b981] shrink-0 mt-0.5">
                                            S
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 text-xs mb-0.5">
                                                <span className="font-semibold text-white">Sarah</span>
                                                <span className="text-[10px] text-[#71717a]">10:43 AM</span>
                                            </div>
                                            <p className="text-xs text-[#a1a1a1] leading-relaxed">
                                                Tested with 50k concurrent sockets. Latency is under 40ms.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Typing Indicator */}
                                    <div className="flex items-center gap-2 text-[11px] text-[#71717a] pl-9 sm:pl-10">
                                        <span>Alex is typing</span>
                                        <span className="flex gap-1">
                                            <span className="typing-dot"></span>
                                            <span className="typing-dot"></span>
                                            <span className="typing-dot"></span>
                                        </span>
                                    </div>
                                </div>

                                {/* Mock Input Bar */}
                                <div className="pt-3 border-t border-[#1f1f1f] flex items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value="Message #general..."
                                        className="flex-1 px-3 sm:px-3.5 py-2 rounded-lg bg-[#0e0e11] border border-[#222226] text-xs font-mono text-[#71717a] outline-none min-w-0"
                                    />
                                    <button
                                        onClick={handleTryDemo}
                                        className="px-3 sm:px-4 py-2 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-colors shrink-0"
                                    >
                                        <span className="sm:hidden">Launch →</span>
                                        <span className="hidden sm:inline">Launch Full App →</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="w-full max-w-4xl text-left mb-16 sm:mb-24">
                    <div className="mb-6">
                        <div className="font-mono text-[10px] uppercase tracking-wider text-[#52a8ff] mb-1">
                            ENGINEERED FOR TEAMS
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-white">
                            Everything developers need. Zero fluff.
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="yc-card p-5 sm:p-6">
                            <div className="w-7 h-7 rounded-lg bg-[#141414] border border-[#2e2e2e] flex items-center justify-center text-[#52a8ff] text-xs mb-3">
                                ⚡
                            </div>
                            <h3 className="text-sm font-semibold text-white">Sub-50ms WebSockets</h3>
                            <p className="mt-1.5 text-xs text-[#a1a1a1] leading-relaxed">
                                Built on Socket.io with Redis pub/sub backplane. Features optimistic message sending and instant presence.
                            </p>
                        </div>

                        <div className="yc-card p-5 sm:p-6">
                            <div className="w-7 h-7 rounded-lg bg-[#141414] border border-[#2e2e2e] flex items-center justify-center text-[#10b981] text-xs mb-3">
                                ✨
                            </div>
                            <h3 className="text-sm font-semibold text-white">In-Line Streamed AI</h3>
                            <p className="mt-1.5 text-xs text-[#a1a1a1] leading-relaxed">
                                Click "Explain" on any code snippet to receive token-by-token GPT-4o-mini breakdowns with per-message caching.
                            </p>
                        </div>

                        <div className="yc-card p-5 sm:p-6">
                            <div className="w-7 h-7 rounded-lg bg-[#141414] border border-[#2e2e2e] flex items-center justify-center text-[#38bdf8] text-xs mb-3">
                                🖥️
                            </div>
                            <h3 className="text-sm font-semibold text-white">VS Code-Grade Shiki</h3>
                            <p className="mt-1.5 text-xs text-[#a1a1a1] leading-relaxed">
                                Powered by Shiki syntax engine across 20+ languages including Rust, TypeScript, Python, and Go.
                            </p>
                        </div>

                        <div className="yc-card p-5 sm:p-6">
                            <div className="w-7 h-7 rounded-lg bg-[#141414] border border-[#2e2e2e] flex items-center justify-center text-[#f59e0b] text-xs mb-3">
                                🔒
                            </div>
                            <h3 className="text-sm font-semibold text-white">AES-256 Key Security</h3>
                            <p className="mt-1.5 text-xs text-[#a1a1a1] leading-relaxed">
                                Bring your own OpenAI API key encrypted at rest with AES-256-GCM, plus an instant guest sandbox.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Architecture Section */}
                <section id="architecture" className="w-full max-w-4xl text-left">
                    <div className="rounded-xl border border-[#222226] bg-[#0c0c0e] p-5 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#222226]">
                            <div>
                                <div className="font-mono text-[10px] uppercase tracking-wider text-[#52a8ff]">
                                    FULL-STACK SPECIFICATION
                                </div>
                                <h3 className="text-sm font-semibold text-white mt-0.5">High-Concurrency Real-Time Infrastructure</h3>
                            </div>
                            <a
                                href="https://github.com/shihabcodes/DevChat"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-mono text-[#52a8ff] hover:underline"
                            >
                                <span>Inspect Source Code</span>
                                <span>↗</span>
                            </a>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 font-mono text-xs">
                            <div>
                                <div className="text-[#52a8ff] text-[10px] uppercase tracking-wider">Frontend</div>
                                <div className="text-white font-medium mt-0.5">Next.js 15</div>
                                <div className="text-[#71717a] text-[10px]">React 19, Shiki</div>
                            </div>
                            <div>
                                <div className="text-[#52a8ff] text-[10px] uppercase tracking-wider">WebSockets</div>
                                <div className="text-white font-medium mt-0.5">Socket.io 4.x</div>
                                <div className="text-[#71717a] text-[10px]">Redis Pub/Sub</div>
                            </div>
                            <div>
                                <div className="text-[#52a8ff] text-[10px] uppercase tracking-wider">AI Streaming</div>
                                <div className="text-white font-medium mt-0.5">GPT-4o-mini</div>
                                <div className="text-[#71717a] text-[10px]">SSE Streaming</div>
                            </div>
                            <div>
                                <div className="text-[#52a8ff] text-[10px] uppercase tracking-wider">Datastore</div>
                                <div className="text-white font-medium mt-0.5">MongoDB 8.x</div>
                                <div className="text-[#71717a] text-[10px]">AES-256 encryption</div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="w-full border-t border-[#1f1f1f] bg-black py-6 mt-auto">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#565656]">
                    <div className="flex items-center gap-2">
                        <span className="text-[#ededed]">DevChat</span>
                        <span>·</span>
                        <span>shihabcodes/DevChat</span>
                    </div>
                    <div className="flex items-center gap-5 text-[#a1a1a1]">
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
