'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import * as data from '@/lib/data';
import { highlightCode } from '@/lib/highlight';
import AuthDialog, { type AuthMode } from '@/components/AuthDialog';
import { Avatar, Logo } from '@/components/ui/Brand';
import type { User } from '@/types';
import {
    ArrowRightIcon, CodeIcon, DatabaseIcon, GitHubIcon, KeyIcon, LockIcon, LogOutIcon, SparklesIcon, ZapIcon,
} from '@/components/ui/icons';

const REPO_URL = 'https://github.com/shihabcodes/DevChat';

// Client-only: sample timestamps are relative to "now" and formatted in the visitor's locale.
const ProductPreview = dynamic(() => import('@/components/landing/ProductPreview'), {
    ssr: false,
    loading: () => <div className="h-[600px] rounded-2xl border border-line-strong bg-bg" />,
});

const POLICY_SQL = `-- Members can read messages in their workspace's channels
create policy "members read messages" on public.messages
  for select to authenticated
  using (private.is_channel_member(channel_id));

-- ...and can only post as themselves
create policy "members post as themselves" on public.messages
  for insert to authenticated
  with check (user_id = (select auth.uid())
              and private.is_channel_member(channel_id));`;

const FEATURES = [
    {
        icon: ZapIcon,
        title: 'Real-time by default',
        body: 'Messages, typing and presence sync live over WebSockets. Sends are optimistic, and anything you miss while offline is backfilled when you reconnect.',
    },
    {
        icon: CodeIcon,
        title: 'Code is a first-class message',
        body: 'Write snippets in a Monaco editor and read them with the same highlighting engine as VS Code, across 20 languages.',
    },
    {
        icon: SparklesIcon,
        title: 'AI that stays in the thread',
        body: 'Explanations stream in under the snippet using your own OpenAI key. Once generated, they’re cached for everyone in the channel.',
    },
];

const UNDER_THE_HOOD = [
    { icon: LockIcon, text: 'Row-level security on every table, keyed on workspace membership' },
    { icon: DatabaseIcon, text: 'A SQL test suite runs 37 allow/deny checks against the real database' },
    { icon: ZapIcon, text: 'Rate limits enforced by Postgres triggers, not middleware' },
    { icon: KeyIcon, text: 'Bring-your-own AI keys, encrypted server-side with AES-256-GCM' },
];

function StaticCode({ code, language }: { code: string; language: string }) {
    const [html, setHtml] = useState<string | null>(null);
    useEffect(() => { highlightCode(code, language).then(setHtml); }, [code, language]);
    return (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="flex h-9 items-center border-b border-line px-4 font-mono text-[11px] text-fg-subtle">
                supabase/migrations/…_core_schema.sql
            </div>
            <div className="overflow-x-auto px-4 py-4 text-[12.5px] leading-[1.7]">
                {html ? (
                    <div className="shiki-host" dangerouslySetInnerHTML={{ __html: html }} />
                ) : (
                    <pre className="font-mono text-fg-muted"><code>{code}</code></pre>
                )}
            </div>
        </div>
    );
}

export default function Home() {
    const router = useRouter();
    const [authOpen, setAuthOpen] = useState(false);
    const [authMode, setAuthMode] = useState<AuthMode>('login');
    const [authError, setAuthError] = useState<string | undefined>();
    const [user, setUser] = useState<User | null>(null);
    const [opening, setOpening] = useState(false);
    const [demoLoading, setDemoLoading] = useState(false);

    const goToWorkspace = useCallback(async () => {
        const user = await data.getCurrentUser();
        if (!user) throw new Error('Could not load your profile. Please try again.');
        const workspace = await data.ensureWorkspace(user);
        router.push(`/workspace/${workspace.id}`);
    }, [router]);

    const openApp = useCallback(async () => {
        setOpening(true);
        try {
            await goToWorkspace();
        } catch {
            setOpening(false);
        }
    }, [goToWorkspace]);

    // Signed-in visitors see who they are, with "Open app" and "Sign out".
    // Returning from Google or an email confirmation link goes straight in;
    // an OAuth error comes back in the URL fragment and is shown in the dialog.
    useEffect(() => {
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const oauthError = hash.get('error_description');
        data.getCurrentUser().then((u) => {
            setUser(u);
            if (u && hash.has('access_token')) openApp();
        }).catch(() => {});
        if (oauthError) {
            history.replaceState(null, '', window.location.pathname);
            setAuthMode('login');
            setAuthError(oauthError.replace(/\+/g, ' '));
            setAuthOpen(true);
        }
    }, [openApp]);

    const signOut = async () => {
        await data.signOut();
        setUser(null);
    };

    const openAuth = useCallback((mode: AuthMode, error?: string) => {
        setAuthMode(mode);
        setAuthError(error);
        setAuthOpen(true);
    }, []);

    const startDemo = useCallback(async () => {
        if (demoLoading) return;
        setDemoLoading(true);
        try {
            const workspaceId = await data.startDemo();
            router.push(`/workspace/${workspaceId}`);
        } catch (err) {
            setDemoLoading(false);
            openAuth('login', err instanceof Error ? err.message : 'Could not start the demo. Please try again.');
        }
    }, [demoLoading, openAuth, router]);

    // Keyboard shortcuts: D = demo, L = sign in, C = create account.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (authOpen || e.metaKey || e.ctrlKey || e.altKey || target.closest('input, textarea, select, [contenteditable]')) return;
            const key = e.key.toLowerCase();
            if (key === 'd') (user ? openApp() : startDemo());
            else if (key === 'l') openAuth('login');
            else if (key === 'c') openAuth('register');
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [authOpen, openAuth, startDemo, openApp, user]);

    // Signed-in visitors get their workspace instead of a demo that would replace their session.
    const primaryCta = () =>
        user ? (
            <button type="button" onClick={openApp} disabled={opening} className="btn btn-lg btn-primary">
                {opening ? 'Opening…' : 'Open your workspace'}
                {!opening && <ArrowRightIcon size={16} />}
            </button>
        ) : (
            <button type="button" onClick={startDemo} disabled={demoLoading} className="btn btn-lg btn-primary">
                {demoLoading ? 'Setting up your workspace…' : 'Try the live demo'}
                {!demoLoading && <ArrowRightIcon size={16} />}
            </button>
        );

    return (
        <div className="min-h-dvh overflow-x-clip">
            {/* Nav */}
            <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/80 backdrop-blur-md">
                <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-6">
                    <a href="#top" aria-label="DevChat home"><Logo /></a>
                    <nav className="hidden items-center gap-7 text-sm text-fg-muted md:flex">
                        <a href="#features" className="hover:text-fg">Features</a>
                        <a href="#under-the-hood" className="hover:text-fg">Under the hood</a>
                        <a href={REPO_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-fg">
                            <GitHubIcon size={15} /> Source
                        </a>
                    </nav>
                    <div className="flex items-center gap-2">
                        {user ? (
                            <>
                                <span className="hidden items-center gap-2 pr-1 text-sm text-fg-muted sm:inline-flex" title={`Signed in as ${user.displayName}`}>
                                    <Avatar name={user.displayName} seed={user.id} src={user.avatar} size={22} />
                                    <span className="max-w-[140px] truncate">{user.displayName}</span>
                                </span>
                                <button type="button" onClick={signOut} className="btn btn-sm btn-ghost" aria-label="Sign out" title="Sign out">
                                    <LogOutIcon size={14} />
                                    <span className="hidden sm:inline">Sign out</span>
                                </button>
                                <button type="button" onClick={openApp} disabled={opening} className="btn btn-sm btn-primary">
                                    {opening ? 'Opening…' : 'Open app'} <ArrowRightIcon size={14} />
                                </button>
                            </>
                        ) : (
                            <>
                                <button type="button" onClick={() => openAuth('login')} className="btn btn-sm btn-ghost">Sign in</button>
                                <button type="button" onClick={() => openAuth('register')} className="btn btn-sm btn-secondary hidden sm:inline-flex">Sign up</button>
                                <button type="button" onClick={startDemo} disabled={demoLoading} className="btn btn-sm btn-primary">
                                    {demoLoading ? 'Starting…' : 'Try demo'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main id="top">
                {/* Hero */}
                <section className="relative">
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 -top-20 h-[520px] bg-[radial-gradient(ellipse_50%_60%_at_50%_0%,rgba(255,178,36,0.09),transparent_70%)]"
                    />
                    <div className="relative mx-auto max-w-6xl px-5 pt-20 text-center sm:px-6 sm:pt-28">
                        <a
                            href={REPO_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface/60 px-3 py-1 text-xs text-fg-muted transition-colors hover:border-fg-subtle hover:text-fg"
                        >
                            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                            Open source · Next.js + Postgres
                            <ArrowRightIcon size={12} />
                        </a>
                        <h1 className="mx-auto mt-6 max-w-3xl text-balance text-[44px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-6xl md:text-7xl">
                            Team chat that speaks code.
                        </h1>
                        <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-fg-muted sm:text-lg">
                            Share snippets with real syntax highlighting. Hit <span className="text-fg">Explain</span> and an AI walkthrough
                            streams in right under the code, cached for the whole channel.
                        </p>
                        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                            {primaryCta()}
                            <a href={REPO_URL} target="_blank" rel="noreferrer" className="btn btn-lg btn-secondary">
                                <GitHubIcon size={16} /> View source
                            </a>
                        </div>
                        {!user && (
                            <p className="mt-4 text-xs text-fg-subtle">
                                No signup. You get a private workspace, deleted after 24 hours. <span className="hidden sm:inline">Or press <span className="kbd">D</span></span>
                            </p>
                        )}
                    </div>

                    <div className="relative mx-auto mt-16 max-w-6xl px-3 sm:px-6">
                        <ProductPreview />
                        <p className="mt-3 text-center text-xs text-fg-subtle">
                            The real app components, rendering sample data. Type in it.
                        </p>
                    </div>
                </section>

                {/* Features */}
                <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-28 sm:px-6">
                    <h2 className="max-w-xl text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">
                        Stop pasting code into Slack, then into ChatGPT.
                    </h2>
                    <p className="mt-4 max-w-xl text-fg-muted">
                        The conversation and the code live in the same place, so the explanation can too.
                    </p>
                    <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
                        {FEATURES.map(({ icon: Icon, title, body }) => (
                            <div key={title} className="bg-bg p-7">
                                <Icon size={20} className="text-accent" />
                                <h3 className="mt-5 font-semibold">{title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{body}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Under the hood */}
                <section id="under-the-hood" className="scroll-mt-20 border-y border-line bg-panel">
                    <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-28 sm:px-6 lg:grid-cols-2">
                        <div>
                            <p className="text-sm font-medium text-accent">Under the hood</p>
                            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">
                                No backend server. The database is the security layer.
                            </h2>
                            <p className="mt-4 leading-relaxed text-fg-muted">
                                Instead of re-checking permissions in an API, every table has row-level security policies in Postgres.
                                The browser can only ever see what the database allows, and a test suite proves it.
                            </p>
                            <ul className="mt-8 space-y-3.5">
                                {UNDER_THE_HOOD.map(({ icon: Icon, text }) => (
                                    <li key={text} className="flex items-start gap-3 text-sm text-fg-muted">
                                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-fg">
                                            <Icon size={13} />
                                        </span>
                                        {text}
                                    </li>
                                ))}
                            </ul>
                            <a href={`${REPO_URL}#engineering-highlights`} target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-fg hover:text-accent">
                                Read the engineering notes <ArrowRightIcon size={14} />
                            </a>
                        </div>
                        <div className="min-w-0">
                            <StaticCode code={POLICY_SQL} language="sql" />
                            <dl className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line text-center">
                                {[['37', 'policy tests'], ['0', 'servers to run'], ['$0', 'hosting / month']].map(([n, label]) => (
                                    <div key={label} className="bg-surface px-3 py-4">
                                        <dt className="sr-only">{label}</dt>
                                        <dd className="text-xl font-semibold tracking-tight">{n}</dd>
                                        <dd className="mt-0.5 text-xs text-fg-subtle">{label}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="mx-auto max-w-6xl px-5 py-28 text-center sm:px-6">
                    <h2 className="text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">See it for yourself.</h2>
                    <p className="mt-3 text-fg-muted">One click, about ten seconds, no account.</p>
                    <div className="mt-8 flex justify-center">{primaryCta()}</div>
                    {!user && <p className="mt-6 text-sm text-fg-subtle">
                        Already have an account?{' '}
                        <button type="button" onClick={() => openAuth('login')} className="font-medium text-fg-muted hover:text-fg">Sign in</button>
                        {' · '}
                        <button type="button" onClick={() => openAuth('invite')} className="font-medium text-fg-muted hover:text-fg">Join with an invite code</button>
                    </p>}
                </section>
            </main>

            <footer className="border-t border-line">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-fg-subtle sm:flex-row sm:px-6">
                    <div className="flex items-center gap-3">
                        <Logo />
                        <span>
                            Built by{' '}
                            <a href="https://github.com/shihabcodes" target="_blank" rel="noreferrer" className="text-fg-muted hover:text-fg">Shihab</a>
                        </span>
                    </div>
                    <div className="flex items-center gap-6">
                        <a href={REPO_URL} target="_blank" rel="noreferrer" className="hover:text-fg">Source</a>
                        <a href="https://shihabcodes.github.io" target="_blank" rel="noreferrer" className="hover:text-fg">Portfolio</a>
                        <span>MIT License</span>
                    </div>
                </div>
            </footer>

            <AuthDialog
                open={authOpen}
                mode={authMode}
                onModeChange={setAuthMode}
                onClose={() => setAuthOpen(false)}
                onSignedIn={goToWorkspace}
                onJoined={(id) => router.push(`/workspace/${id}`)}
                initialError={authError}
            />
        </div>
    );
}
