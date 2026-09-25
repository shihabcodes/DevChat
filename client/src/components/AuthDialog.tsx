'use client';

import { useEffect, useState } from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
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

    const handleGoogle = (res: CredentialResponse) =>
        run(async () => {
            if (!res.credential) throw new Error('Google did not return a credential');
            await data.signInWithGoogleIdToken(res.credential);
            await onSignedIn();
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
                        {mode === 'register' && (
                            <div>
                                <label htmlFor="name" className="mb-1.5 block text-[13px] font-medium">Name</label>
                                <input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ada Lovelace" required maxLength={40} autoComplete="name" className="input" />
                            </div>
                        )}
                        <div>
                            <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium">Email</label>
                            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required autoComplete="email" autoFocus className="input" />
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

                        {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
                            <>
                                <div className="flex items-center gap-3 py-1 text-xs text-fg-subtle">
                                    <div className="h-px flex-1 bg-line" /> or <div className="h-px flex-1 bg-line" />
                                </div>
                                <div className="flex justify-center">
                                    <GoogleLogin onSuccess={handleGoogle} onError={() => setError('Google sign-in failed')} theme="filled_black" shape="pill" />
                                </div>
                            </>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
}
