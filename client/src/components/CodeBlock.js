'use client';

import { useState } from 'react';

export default function CodeBlock({ code, language, messageId, onExplain }) {
    const [copied, setCopied] = useState(false);
    const [explaining, setExplaining] = useState(false);
    const [explanation, setExplanation] = useState(null);
    const [showExplain, setShowExplain] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleExplain = async () => {
        if (explanation) {
            setShowExplain(!showExplain);
            return;
        }
        setExplaining(true);
        setShowExplain(true);
        try {
            const result = await onExplain(messageId, code, language);
            setExplanation(result.explanation);
        } catch (err) {
            setExplanation('Failed to generate explanation. Please check your API key configuration.');
        } finally {
            setExplaining(false);
        }
    };

    const lines = code.split('\n');

    return (
        <div style={{ marginTop: '0.25rem' }}>
            <div style={{
                background: '#1E1E2E',
                borderRadius: 10,
                overflow: 'hidden',
                border: '1px solid #2D2D5E',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(0,0,0,0.2)',
                    borderBottom: '1px solid #2D2D5E',
                }}>
                    <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: '#A855F7',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontFamily: 'JetBrains Mono, monospace',
                    }}>
                        {language || 'code'}
                    </span>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                            onClick={handleExplain}
                            style={{
                                padding: '0.25rem 0.6rem',
                                borderRadius: 6,
                                border: '1px solid rgba(79, 70, 229, 0.3)',
                                background: showExplain ? 'rgba(79, 70, 229, 0.15)' : 'transparent',
                                color: '#6366F1',
                                cursor: 'pointer',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                fontFamily: 'Inter, sans-serif',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                            }}
                        >
                            ✨ Explain
                        </button>
                        <button
                            onClick={handleCopy}
                            style={{
                                padding: '0.25rem 0.6rem',
                                borderRadius: 6,
                                border: '1px solid #2D2D5E',
                                background: 'transparent',
                                color: copied ? '#16A34A' : '#9CA3AF',
                                cursor: 'pointer',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                fontFamily: 'Inter, sans-serif',
                                transition: 'all 0.2s',
                            }}
                        >
                            {copied ? '✓ Copied' : 'Copy'}
                        </button>
                    </div>
                </div>

                {/* Code Content */}
                <div style={{ overflow: 'auto', maxHeight: 400 }}>
                    <pre style={{
                        margin: 0,
                        padding: '0.75rem',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '0.8rem',
                        lineHeight: 1.7,
                        color: '#E2E8F0',
                    }}>
                        <code>
                            {lines.map((line, i) => (
                                <div key={i} style={{ display: 'flex' }}>
                                    <span style={{
                                        display: 'inline-block',
                                        width: '2.5rem',
                                        textAlign: 'right',
                                        color: '#4B5563',
                                        marginRight: '1rem',
                                        userSelect: 'none',
                                        flexShrink: 0,
                                    }}>
                                        {i + 1}
                                    </span>
                                    <span style={{ flex: 1 }}>{line || ' '}</span>
                                </div>
                            ))}
                        </code>
                    </pre>
                </div>
            </div>

            {/* AI Explanation */}
            {showExplain && (
                <div className="ai-card animate-fade-in" style={{ marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.9rem' }}>✨</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A855F7' }}>AI Explanation</span>
                    </div>
                    {explaining ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <div className="skeleton" style={{ height: 14, width: '90%' }} />
                            <div className="skeleton" style={{ height: 14, width: '75%' }} />
                            <div className="skeleton" style={{ height: 14, width: '60%' }} />
                        </div>
                    ) : (
                        <div style={{
                            fontSize: '0.835rem',
                            lineHeight: 1.65,
                            color: '#D1D5DB',
                            whiteSpace: 'pre-wrap',
                        }}>
                            {explanation}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
