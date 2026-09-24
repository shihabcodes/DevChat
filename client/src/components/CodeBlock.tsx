'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

import { highlightCode } from '@/lib/highlight';

export interface CodeBlockProps {
    code: string;
    language?: string;
    cachedExplanation?: string | null;
}

export default function CodeBlock({ code, language, cachedExplanation }: CodeBlockProps) {
    const [copied, setCopied] = useState<boolean>(false);
    const explaining = false;
    const explanation = cachedExplanation || null;
    const [showExplain, setShowExplain] = useState<boolean>(Boolean(cachedExplanation));
    const [html, setHtml] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

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

    // TODO(ai-route): stream from the new /api/ai/explain route once it exists.
    const handleExplain = () => {
        if (!explanation) setError('AI explanations are being rebuilt and will be back shortly.');
        setShowExplain((v) => !v);
    };

    return (
        <div className="mt-1.5 w-full font-sans">
            {/* Code Box */}
            <div className="rounded-xl border border-[#1f1f1f] bg-[#0c0c0e] overflow-hidden">
                {/* Code Box Header */}
                <div className="flex items-center justify-between px-3.5 py-2 bg-[#121214] border-b border-[#1f1f1f]">
                    <span className="text-[10px] font-mono text-[#52a8ff] uppercase font-semibold">
                        {language || 'code'}
                    </span>
                    <div className="flex items-center gap-2">
                        {/* Explain Button */}
                        <button
                            onClick={handleExplain}
                            disabled={explaining}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono font-medium border transition-colors ${
                                showExplain && explanation
                                    ? 'border-[#52a8ff]/40 bg-[#52a8ff]/15 text-[#52a8ff]'
                                    : 'border-[#2e2e2e] bg-[#141414] text-[#a1a1a1] hover:text-white hover:border-[#3a3a3a]'
                            } ${explaining ? 'opacity-60 cursor-wait' : ''}`}
                        >
                            <span>✨</span>
                            <span>{explaining ? 'Explaining…' : showExplain && explanation ? 'Hide AI' : 'Explain Code'}</span>
                        </button>

                        {/* Copy Button */}
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-[#71717a] hover:text-white hover:bg-[#18181b] transition-colors"
                        >
                            {copied ? (
                                <span className="text-[#10b981]">Copied!</span>
                            ) : (
                                <span>Copy</span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Code Body */}
                <div className="overflow-auto max-h-[380px]">
                    {html ? (
                        <div
                            className="text-xs leading-relaxed p-3.5 [&_pre]:!bg-transparent [&_pre]:!p-0 [&_pre]:!m-0 [&_code]:!font-mono"
                            dangerouslySetInnerHTML={{ __html: html }}
                        />
                    ) : (
                        <pre className="m-0 p-3.5 font-mono text-xs leading-relaxed text-[#e4e4e7]">
                            <code>{code}</code>
                        </pre>
                    )}
                </div>
            </div>

            {/* In-Line AI Explanation Card */}
            {showExplain && (
                <div className="mt-2.5 ai-card animate-fade-in text-xs font-mono text-[#d4d4d8] leading-relaxed">
                    <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#1f1f1f] text-[10px] text-[#52a8ff] uppercase tracking-wider">
                        <div className="flex items-center gap-1.5">
                            <span>✨</span>
                            <span>AI Code Explanation</span>
                        </div>
                        <button
                            onClick={() => setShowExplain(false)}
                            className="text-[#71717a] hover:text-white transition-colors"
                            aria-label="Close"
                        >
                            ✕
                        </button>
                    </div>

                    {error && (
                        <div className="p-2 rounded bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#fca5a5] mb-2 text-xs">
                            {error}
                        </div>
                    )}

                    {explanation ? (
                        <div className="prose prose-invert max-w-none text-xs leading-relaxed [&_p]:mb-2 [&_ul]:pl-4 [&_li]:list-disc">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeSanitize]}
                            >
                                {explanation}
                            </ReactMarkdown>
                            {explaining && (
                                <span className="inline-block w-1.5 h-3.5 bg-[#52a8ff] ml-1 animate-pulse" />
                            )}
                        </div>
                    ) : explaining ? (
                        <div className="flex items-center gap-2 text-xs text-[#71717a]">
                            <span className="typing-dot" />
                            <span className="typing-dot" />
                            <span className="typing-dot" />
                            <span>Synthesizing code breakdown…</span>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}
