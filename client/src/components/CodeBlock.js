'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

import api, { ApiError } from '@/lib/api';
import { highlightCode } from '@/lib/highlight';

export default function CodeBlock({ code, language, messageId, onMissingKey }) {
    const [copied, setCopied] = useState(false);
    const [explaining, setExplaining] = useState(false);
    const [explanation, setExplanation] = useState(null);
    const [showExplain, setShowExplain] = useState(false);
    const [html, setHtml] = useState(null);
    const [needsKey, setNeedsKey] = useState(false);
    const [error, setError] = useState(null);
    const streamRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const h = await highlightCode(code, language);
            if (!cancelled) setHtml(h);
        })();
        return () => { cancelled = true; };
    }, [code, language]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {/* ignore */}
    };

    const cancelledRef = useRef(false);

    const handleExplain = async () => {
        if (explanation) {
            setShowExplain((v) => !v);
            return;
        }
        if (!showExplain) setShowExplain(true);
        if (explaining) return;
        setExplaining(true);
        setError(null);
        setNeedsKey(false);
        setExplanation('');
        cancelledRef.current = false;
        try {
            const stream = api.explainCodeStream({
                messageId,
                code,
                language,
                onDelta: (delta, full) => setExplanation(full),
            });
            streamRef.current = stream;
            const { text } = await stream.result;
            if (cancelledRef.current) return;
            if (text) setExplanation(text);
            setExplaining(false);
        } catch (err) {
            if (cancelledRef.current) return;
            setExplaining(false);
            if (err instanceof ApiError && err.code === 'NO_OPENAI_KEY') {
                setNeedsKey(true);
                if (onMissingKey) onMissingKey();
            } else {
                setError(err.message || 'Failed to generate explanation');
            }
        } finally {
            streamRef.current = null;
        }
    };

    useEffect(() => () => {
        cancelledRef.current = true;
        if (streamRef.current) {
            streamRef.current.cancel();
            streamRef.current = null;
        }
    }, []);

    return (
        <div className="mt-1.5 w-full">
            {/* Code Box */}
            <div className="rounded-xl overflow-hidden border border-border bg-[#1A1A30]/50 shadow-md">
                {/* Code Box Header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-bg-dark/40 border-b border-border/60">
                    <span className="text-[0.68rem] font-bold text-accent-purple uppercase tracking-widest font-mono">
                        {language || 'code'}
                    </span>
                    <div className="flex items-center gap-2">
                        {/* Explain Button */}
                        <button
                            onClick={handleExplain}
                            disabled={explaining}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.68rem] font-bold border transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0
                                ${showExplain
                                    ? 'border-primary/50 bg-primary/20 text-[#818CF8]'
                                    : 'border-primary/20 bg-primary/5 text-primary-light hover:border-primary/50 hover:bg-primary/10'}
                                ${explaining ? 'opacity-60 cursor-wait' : ''}`}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l-.813-5.096L3 15l5.096-.813L9 9l.813 5.096L15 15l-5.187.904zM18 10.5l-.5 2.5-.5-2.5-2.5-.5 2.5-.5.5-2.5.5 2.5 2.5.5-2.5.5zM21 4.5l-.25 1.25-.25-1.25-1.25-.25 1.25-.25.25-1.25.25 1.25 1.25.25-1.25.25z" />
                            </svg>
                            <span>{explaining ? 'Explaining…' : showExplain ? 'Hide Explanation' : 'Explain Code'}</span>
                        </button>

                        {/* Copy Button */}
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.68rem] font-bold border border-border/80 text-text-muted hover:text-text-primary hover:border-border-light hover:bg-white/[0.02] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                        >
                            {copied ? (
                                <>
                                    <svg className="w-3.5 h-3.5 text-success" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                    <span className="text-success">Copied</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25M15.75 18.75A2.25 2.25 0 0113.5 21h-6a2.25 2.25 0 01-2.25-2.25V15m10.5-6v-1.5A3.375 3.375 0 0010.5 4.125h-.875m0 0a2.25 2.25 0 00-2.25 2.25V15" />
                                    </svg>
                                    <span>Copy</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Code Editor Body */}
                <div className="overflow-auto max-h-[380px]">
                    {html ? (
                        <div
                            className="shiki-wrapper text-[0.8rem] leading-[1.75] p-4 [&_pre]:!bg-transparent [&_pre]:!p-0 [&_pre]:!m-0 [&_code]:!font-mono"
                            dangerouslySetInnerHTML={{ __html: html }}
                        />
                    ) : (
                        <pre className="m-0 p-4 font-mono text-[0.8rem] leading-[1.75] text-[#E2E8F0]">
                            <code>{code}</code>
                        </pre>
                    )}
                </div>
            </div>

            {/* AI Explanation Area */}
            {showExplain && (
                <div className="ai-card animate-fade-in mt-3">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm">✨</span>
                        <span className="text-xs font-extrabold uppercase tracking-widest text-accent-purple">AI Explanation</span>
                        {explaining && (
                            <span className="ml-auto text-[0.62rem] text-text-dim font-bold uppercase tracking-wider animate-pulse">Streaming response</span>
                        )}
                    </div>
                    {needsKey ? (
                        <div className="text-[0.82rem] leading-relaxed text-text-muted space-y-2">
                            <p>To use AI explanations, configure an OpenAI API key in **AI Settings** (sidebar bottom).</p>
                            <p className="text-[0.72rem] text-text-dim">
                                Your key is encrypted with AES-256-GCM at rest and sent directly to OpenAI. We do not store or share your key.
                            </p>
                        </div>
                    ) : error ? (
                        <div className="text-[0.82rem] text-danger font-medium">{error}</div>
                    ) : explaining && !explanation ? (
                        <div className="flex flex-col gap-2 py-1">
                            <div className="skeleton h-3.5 w-[92%]" />
                            <div className="skeleton h-3.5 w-[80%]" />
                            <div className="skeleton h-3.5 w-[65%]" />
                        </div>
                    ) : (
                        <div className="text-[0.82rem] leading-relaxed text-text-primary prose prose-invert prose-sm max-w-none prose-pre:my-2 prose-code:before:content-none prose-code:after:content-none font-medium">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                                {explanation || ''}
                            </ReactMarkdown>
                            {explaining && <span className="inline-block w-1.5 h-3.5 bg-accent-purple ml-1 animate-pulse align-middle" />}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
