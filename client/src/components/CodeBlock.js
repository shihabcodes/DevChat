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
        <div className="mt-1">
            <div className="rounded-[10px] overflow-hidden border border-[#2D2D5E] bg-[#1E1E2E]">
                <div className="flex items-center justify-between px-3 py-2 bg-black/20 border-b border-[#2D2D5E]">
                    <span className="text-[0.7rem] font-semibold text-[#A855F7] uppercase tracking-wider font-['JetBrains_Mono',monospace]">
                        {language || 'code'}
                    </span>
                    <div className="flex gap-1.5">
                        <button
                            onClick={handleExplain}
                            disabled={explaining}
                            className={`px-2 py-1 rounded-md text-[0.7rem] font-semibold border transition-all
                                ${showExplain
                                    ? 'border-[rgba(79,70,229,0.4)] bg-[rgba(79,70,229,0.15)] text-[#818CF8]'
                                    : 'border-[rgba(79,70,229,0.3)] text-[#6366F1] hover:bg-[rgba(79,70,229,0.1)]'}
                                ${explaining ? 'opacity-60 cursor-wait' : ''}`}
                        >
                            {explaining ? '✨ Explaining…' : explanation ? '✨ Hide explanation' : '✨ Explain'}
                        </button>
                        <button
                            onClick={handleCopy}
                            className="px-2 py-1 rounded-md text-[0.7rem] font-semibold border border-[#2D2D5E] text-[#9CA3AF] hover:text-white hover:border-[#3D3D6E]"
                        >
                            {copied ? '✓ Copied' : 'Copy'}
                        </button>
                    </div>
                </div>
                <div className="overflow-auto max-h-[400px]">
                    {html ? (
                        <div
                            className="shiki-wrapper text-[0.8rem] leading-[1.7] p-3 [&_pre]:!bg-transparent [&_pre]:!p-0 [&_pre]:!m-0 [&_code]:!font-['JetBrains_Mono',monospace]"
                            dangerouslySetInnerHTML={{ __html: html }}
                        />
                    ) : (
                        <pre className="m-0 p-3 font-['JetBrains_Mono',monospace] text-[0.8rem] leading-[1.7] text-[#E2E8F0]">
                            <code>{code}</code>
                        </pre>
                    )}
                </div>
            </div>

            {showExplain && (
                <div className="ai-card animate-fade-in mt-2">
                    <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-base">✨</span>
                        <span className="text-[0.75rem] font-bold text-[#A855F7]">AI Explanation</span>
                        {explaining && (
                            <span className="ml-auto text-[0.65rem] text-[#6B7280] italic">streaming…</span>
                        )}
                    </div>
                    {needsKey ? (
                        <div className="text-[0.835rem] text-[#D1D5DB]">
                            <p className="mb-2">To use AI explanations, add an OpenAI API key in <strong>AI Settings</strong> (sidebar bottom).</p>
                            <p className="text-[#9CA3AF] text-[0.75rem]">
                                Your key is encrypted at rest and used only to call OpenAI on your behalf. We never log or share it.
                            </p>
                        </div>
                    ) : error ? (
                        <div className="text-[0.835rem] text-[#FCA5A5]">{error}</div>
                    ) : explaining && !explanation ? (
                        <div className="flex flex-col gap-1.5">
                            <div className="skeleton h-3.5 w-[90%]" />
                            <div className="skeleton h-3.5 w-[75%]" />
                            <div className="skeleton h-3.5 w-[60%]" />
                        </div>
                    ) : (
                        <div className="text-[0.835rem] leading-relaxed text-[#D1D5DB] prose prose-invert prose-sm max-w-none prose-pre:my-2 prose-code:before:content-none prose-code:after:content-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                                {explanation || ''}
                            </ReactMarkdown>
                            {explaining && <span className="inline-block w-1.5 h-3.5 bg-[#A855F7] ml-0.5 animate-pulse align-middle" />}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
