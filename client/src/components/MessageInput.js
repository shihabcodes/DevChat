'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const LANGUAGES = [
    'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
    'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'html', 'css',
    'sql', 'bash', 'json', 'yaml', 'markdown',
];

export default function MessageInput({ onSend, onTyping, onStopTyping }) {
    const [content, setContent] = useState('');
    const [codeMode, setCodeMode] = useState(false);
    const [language, setLanguage] = useState('javascript');
    const [codeContent, setCodeContent] = useState('');
    const inputRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        if (!codeMode && inputRef.current) {
            inputRef.current.focus();
        }
    }, [codeMode]);

    const handleTyping = () => {
        onTyping?.();
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            onStopTyping?.();
        }, 2000);
    };

    const handleSend = () => {
        if (codeMode) {
            if (codeContent.trim()) {
                onSend(codeContent.trim(), 'code', language);
                setCodeContent('');
                setCodeMode(false);
            }
        } else {
            if (content.trim()) {
                onSend(content.trim(), 'text');
                setContent('');
            }
        }
        onStopTyping?.();
        clearTimeout(typingTimeoutRef.current);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !codeMode) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div style={{
            borderTop: '1px solid #2D2D5E',
            padding: '0.75rem 1.25rem',
            background: '#0F0F23',
        }}>
            {/* Code Mode Toggle & Language */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem',
            }}>
                <button
                    onClick={() => setCodeMode(!codeMode)}
                    style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: 6,
                        border: `1px solid ${codeMode ? '#4F46E5' : '#2D2D5E'}`,
                        background: codeMode ? 'rgba(79, 70, 229, 0.15)' : 'transparent',
                        color: codeMode ? '#6366F1' : '#9CA3AF',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        fontFamily: 'JetBrains Mono, monospace',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                    }}
                >
                    {'</>'}
                    <span style={{ fontFamily: 'Inter, sans-serif' }}>
                        {codeMode ? 'Code Mode' : 'Code'}
                    </span>
                </button>

                {codeMode && (
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        style={{
                            padding: '0.35rem 0.5rem',
                            borderRadius: 6,
                            border: '1px solid #2D2D5E',
                            background: '#13132E',
                            color: '#A855F7',
                            fontSize: '0.75rem',
                            fontFamily: 'JetBrains Mono, monospace',
                            outline: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        {LANGUAGES.map((lang) => (
                            <option key={lang} value={lang}>{lang}</option>
                        ))}
                    </select>
                )}

                <div style={{ flex: 1 }} />

                <button
                    onClick={handleSend}
                    disabled={codeMode ? !codeContent.trim() : !content.trim()}
                    style={{
                        padding: '0.4rem 1rem',
                        borderRadius: 8,
                        border: 'none',
                        background: 'linear-gradient(135deg, #4F46E5, #6366F1)',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        fontFamily: 'Inter, sans-serif',
                        opacity: (codeMode ? !codeContent.trim() : !content.trim()) ? 0.4 : 1,
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 8px rgba(79, 70, 229, 0.2)',
                    }}
                >
                    Send
                </button>
            </div>

            {/* Input Area */}
            {codeMode ? (
                <div style={{
                    borderRadius: 10,
                    overflow: 'hidden',
                    border: '1px solid #2D2D5E',
                    height: 200,
                }}>
                    <MonacoEditor
                        height="200px"
                        language={language}
                        value={codeContent}
                        onChange={(val) => {
                            setCodeContent(val || '');
                            handleTyping();
                        }}
                        theme="vs-dark"
                        options={{
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            fontSize: 13,
                            fontFamily: 'JetBrains Mono, monospace',
                            lineNumbers: 'on',
                            roundedSelection: true,
                            automaticLayout: true,
                            padding: { top: 8 },
                            overviewRulerBorder: false,
                            hideCursorInOverviewRuler: true,
                            renderLineHighlight: 'gutter',
                        }}
                    />
                </div>
            ) : (
                <textarea
                    ref={inputRef}
                    value={content}
                    onChange={(e) => {
                        setContent(e.target.value);
                        handleTyping();
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                    rows={1}
                    style={{
                        width: '100%',
                        padding: '0.7rem 0.85rem',
                        borderRadius: 10,
                        border: '1px solid #2D2D5E',
                        background: '#13132E',
                        color: '#F9FAFB',
                        fontSize: '0.875rem',
                        fontFamily: 'Inter, sans-serif',
                        outline: 'none',
                        resize: 'none',
                        minHeight: 42,
                        maxHeight: 130,
                        transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#4F46E5')}
                    onBlur={(e) => (e.target.style.borderColor = '#2D2D5E')}
                />
            )}
        </div>
    );
}
