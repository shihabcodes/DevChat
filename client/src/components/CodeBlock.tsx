'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

import { highlightCode } from '@/lib/highlight';
import { AiError, explainMessage } from '@/lib/ai';
import { CheckIcon, CopyIcon, SparklesIcon, XIcon } from '@/components/ui/icons';

export interface CodeBlockProps {
    code: string;
    language?: string;
    messageId?: string;
    cachedExplanation?: string | null;
    onMissingKey?: () => void;
    /** Landing-page preview: never calls the API, only toggles the cached explanation. */
    preview?: boolean;
}

export default function CodeBlock({ code, language, messageId, cachedExplanation, onMissingKey, preview }: CodeBlockProps) {
    const [copied, setCopied] = useState(false);
    const [explaining, setExplaining] = useState(false);
    const [explanation, setExplanation] = useState<string | null>(cachedExplanation || null);
    const [showExplain, setShowExplain] = useState(Boolean(cachedExplanation));
    const [html, setHtml] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => () => abortRef.current?.abort(), []);

    // A teammate's explanation can arrive via a refetch after we mounted.
    useEffect(() => {
        if (cachedExplanation && !explaining) setExplanation(cachedExplanation);
    }, [cachedExplanation, explaining]);

    useEffect(() => {
        let cancelled = false;
        highlightCode(code, language).then((h) => { if (!cancelled) setHtml(h); });
        return () => { cancelled = true; };
    }, [code, language]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {/* clipboard blocked */}
    };

    const handleExplain = async () => {
        if (explanation && !explaining) {
            setShowExplain((v) => !v);
            return;
        }
        if (explaining || preview) return;
        setShowExplain(true);
        setError(null);
        if (!messageId || messageId.startsWith('tmp-')) {
            setError('Wait for the message to finish sending, then try again.');
            return;
        }
        setExplaining(true);
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        try {
            const text = await explainMessage(messageId, setExplanation, ctrl.signal);
            setExplanation(text || null);
        } catch (e) {
            if (ctrl.signal.aborted) return;
            setExplanation(null);
            setError(e instanceof Error ? e.message : 'Failed to generate explanation');
            if (e instanceof AiError && e.code === 'NO_OPENAI_KEY') onMissingKey?.();
        } finally {
            if (!ctrl.signal.aborted) setExplaining(false);
        }
    };

    const lines = code.split('\n').length;
    const explainLabel = explaining ? 'Explaining…' : explanation ? (showExplain ? 'Hide explanation' : 'Show explanation') : 'Explain';

    return (
        <div className="mt-1.5 overflow-hidden rounded-xl border border-line bg-surface">
            <div className="flex h-9 items-center justify-between border-b border-line pl-3.5 pr-1.5">
                <div className="flex items-center gap-2 font-mono text-[11px] text-fg-subtle">
                    <span className="text-fg-muted">{language || 'text'}</span>
                    <span aria-hidden>·</span>
                    <span>{lines} {lines === 1 ? 'line' : 'lines'}</span>
                </div>
                <div className="flex items-center gap-0.5">
                    <button
                        type="button"
                        onClick={handleExplain}
                        disabled={explaining}
                        className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors ${
                            showExplain && explanation
                                ? 'bg-accent-soft text-accent'
                                : 'text-fg-muted hover:bg-elevated hover:text-fg'
                        } disabled:cursor-wait`}
                    >
                        <SparklesIcon size={14} className={explaining ? 'animate-pulse text-accent' : ''} />
                        {explainLabel}
                    </button>
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="icon-btn h-7 w-7"
                        aria-label={copied ? 'Copied' : 'Copy code'}
                        title={copied ? 'Copied' : 'Copy'}
                    >
                        {copied ? <CheckIcon size={14} className="text-success" /> : <CopyIcon size={14} />}
                    </button>
                </div>
            </div>

            <div className="max-h-[420px] overflow-auto">
                {html ? (
                    <div className="shiki-host px-4 py-3.5 text-[13px] leading-[1.65]" dangerouslySetInnerHTML={{ __html: html }} />
                ) : (
                    <pre className="px-4 py-3.5 font-mono text-[13px] leading-[1.65] text-fg"><code>{code}</code></pre>
                )}
            </div>

            {showExplain && (
                <div className="animate-fade-in border-t border-line bg-bg/40 px-4 py-3.5">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent">
                            <SparklesIcon size={13} />
                            AI explanation
                        </span>
                        <button type="button" onClick={() => setShowExplain(false)} className="icon-btn h-6 w-6" aria-label="Close explanation">
                            <XIcon size={13} />
                        </button>
                    </div>

                    {error && (
                        <p className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-[13px] text-[#ffb3b5]">{error}</p>
                    )}

                    {explanation ? (
                        <div className="prose-chat text-[13.5px] text-fg-muted">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                                {explanation}
                            </ReactMarkdown>
                            {explaining && <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-accent align-middle" />}
                        </div>
                    ) : explaining ? (
                        <div className="flex items-center gap-2 text-[13px] text-fg-subtle">
                            <span className="flex gap-1"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></span>
                            Reading the code…
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}
