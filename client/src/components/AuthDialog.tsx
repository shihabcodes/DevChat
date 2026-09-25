'use client';

import { useEffect, useState } from 'react';
import * as data from '@/lib/data';
import { LogoMark } from './ui/Brand';
import { XIcon } from './ui/icons';

export type AuthMode = 'login' | 'register' | 'invite';

interface AuthDialogProps {
    open: boolean;
    mode: AuthMode;
    onModeChange: (mode: AuthMode) => void;
    onClose: () => void;
    /** Called after a successful sign-in; navigates into the app. */
    onSignedIn: () => Promise<void>;
    /** Navigate straight to a workspace (after joining by invite). */
    onJoined: (workspaceId: string) => void;
    initialError?: string;
}

const TABS: { mode: AuthMode; label: string }[] = [
    { mode: 'login', label: 'Sign in' },
    { mode: 'register', label: 'Create account' },
    { mode: 'invite', label: 'Join with code' },
];

const errorText = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

export default function AuthDialog({ open, mode, onModeChange, onClose, onSignedIn, onJoined, initialError }: AuthDialogProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleEnabled, setGoogleEnabled] = useState(false);
    const [redirecting, setRedirecting] = useState(false);

    // Only offer Google once it's actually enabled on the Supabase project.
    useEffect(() => {
        if (open) data.getEnabledProviders().then((p) => setGoogleEnabled(p.google));
    }, [open]);

    useEffect(() => {
        if (open) setError(initialError ?? '');
    }, [open, initialError]);

    useEffect(() => {
        setError('');
        setNotice('');
    }, [mode]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    const run = async (fn: () => Promise<void>, fallback: string) => {
        setError('');
        setNotice('');
        setLoading(true);
        try {
            await fn();
        } catch (err) {
            setError(errorText(err, fallback));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        run(async () => {
            if (mode === 'register') {
                const { needsConfirmation } = await data.signUp(email, password, displayName);
                if (needsConfirmation) {
                    setNotice(`Check ${email} for a confirmation link to finish signing up.`);
                    return;
                }
            } else {
                await data.signIn(email, password);
            }
            await onSignedIn();
        }, 'Authentication failed');
    };

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        run(async () => {
            if (!(await data.getCurrentUser())) {
                throw new Error('Sign in or create an account first, then come back and join with the code.');
            }
            const workspace = await data.joinWorkspace(inviteCode);
            onJoined(workspace.id);
        }, 'That invite code is not valid.');
    };

    const handleGoogle = () =>
        run(async () => {
            setRedirecting(true);
            try {
                await data.signInWithGoogle(); // navigates away on success
            } catch (err) {
                setRedirecting(false);
                throw err;
            }
        }, 'Google sign-in failed');

    const title = mode === 'register' ? 'Create your account' : mode === 'invite' ? 'Join a workspace' : 'Welcome back';

    return (
        <div
            className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div role="dialog" aria-modal="true" aria-labelledby="auth-title" className="relative w-full max-w-[400px] rounded-2xl border border-line-strong bg-surface p-6 shadow-2xl shadow-black/60">
                <button type="button" onClick={onClose} className="icon-btn absolute right-3 top-3" aria-label="Close">
                    <XIcon size={16} />
                </button>

                <LogoMark size={28} />
                <h2 id="auth-title" className="mt-4 text-lg font-semibold tracking-tight">{title}</h2>

                <div className="mt-4 grid grid-cols-3 gap-1 rounded-lg border border-line bg-bg p-1" role="tablist">
                    {TABS.map((t) => (
                        <button
                            key={t.mode}
                            type="button"
                            role="tab"
                            aria-selected={mode === t.mode}
                            onClick={() => onModeChange(t.mode)}
                            className={`h-8 rounded-md text-[13px] font-medium transition-colors ${
                                mode === t.mode ? 'bg-elevated text-fg' : 'text-fg-subtle hover:text-fg'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {error && <p className="mt-4 rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-[#ffb3b5]">{error}</p>}
                {notice && <p role="status" className="mt-4 rounded-lg border border-success/25 bg-success/10 px-3 py-2 text-sm text-[#a7f3cf]">{notice}</p>}

                {mode === 'invite' ? (
                    <form onSubmit={handleJoin} className="mt-4 space-y-3">
                        <div>
                            <label htmlFor="invite" className="mb-1.5 block text-[13px] font-medium">Invite code</label>
                            <input id="invite" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="a1b2c3d4e5f6a7b8" required autoFocus className="input font-mono" />
                            <p className="mt-1.5 text-xs text-fg-subtle">Ask a workspace owner for the code under the link icon in their sidebar.</p>
                        </div>
                        <button type="submit" disabled={loading || !inviteCode.trim()} className="btn btn-primary w-full">
                            {loading ? 'Joining…' : 'Join workspace'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                        {googleEnabled && (
                            <>
                                <button type="button" onClick={handleGoogle} disabled={redirecting} className="btn btn-secondary w-full">
                                    <GoogleMark />
                                    {redirecting ? 'Redirecting to Google…' : 'Continue with Google'}
                                </button>
                                <div className="flex items-center gap-3 py-1 text-xs text-fg-subtle">
                                    <div className="h-px flex-1 bg-line" /> or with email <div className="h-px flex-1 bg-line" />
                                </div>
                            </>
                        )}
                        {mode === 'register' && (
                            <div>
                                <label htmlFor="name" className="mb-1.5 block text-[13px] font-medium">Name</label>
                                <input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ada Lovelace" required maxLength={40} autoComplete="name" autoFocus className="input" />
                            </div>
                        )}
                        <div>
                            <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium">Email</label>
                            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required autoComplete="email" autoFocus={mode === 'login'} className="input" />
                        </div>
                        <div>
                            <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium">Password</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={mode === 'register' ? 'At least 8 characters' : ''}
                                required
                                minLength={mode === 'register' ? 8 : undefined}
                                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                                className="input"
                            />
                        </div>
                        <button type="submit" disabled={loading} className="btn btn-primary w-full">
                            {loading ? 'One moment…' : mode === 'login' ? 'Sign in' : 'Create account'}
                        </button>

                    </form>
                )}
            </div>
        </div>
    );
}

function GoogleMark() {
    return (
        <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
    );
}
