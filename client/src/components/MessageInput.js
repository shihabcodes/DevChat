'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const LANGUAGES = [
    'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
    'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'html', 'css',
    'sql', 'bash', 'json', 'yaml', 'markdown',
];

export default function MessageInput({ onSend, onTyping, onStopTyping, disabled = false }) {
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
        <div className="border-t border-border/25 p-4 bg-[#0F0F23] flex flex-col gap-3 z-10 shadow-lg">
            {/* Toolbar Row */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    {/* Code Mode Toggle */}
                    <button
                        onClick={() => setCodeMode(!codeMode)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0
                            ${codeMode
                                ? 'border-primary bg-primary/15 text-primary-light'
                                : 'border-border text-text-muted hover:text-text-primary'}`}
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                        </svg>
                        <span>{codeMode ? 'Code Mode' : 'Share Code'}</span>
                    </button>

                    {/* Language Selector */}
                    {codeMode && (
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg border border-border bg-bg-input text-accent-purple text-xs font-mono outline-none cursor-pointer focus:border-primary transition-all"
                        >
                            {LANGUAGES.map((lang) => (
                                <option key={lang} value={lang}>{lang}</option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Send Button */}
                <button
                    onClick={handleSend}
                    disabled={disabled || (codeMode ? !codeContent.trim() : !content.trim())}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all duration-200 bg-gradient-to-r from-primary to-primary-light hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_2px_8px_rgba(79,70,229,0.2)] hover:-translate-y-0.5 active:translate-y-0"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                    <span>Send</span>
                </button>
            </div>

            {/* Input Element Container */}
            {codeMode ? (
                <div className="rounded-xl overflow-hidden border border-border shadow-inner bg-[#1e1e2e] h-[200px]">
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
                    disabled={disabled}
                    placeholder={disabled ? 'Reconnecting…' : 'Type a message... (Enter to send, Shift+Enter for new line)'}
                    rows={1}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-bg-input text-text-primary text-sm outline-none resize-none min-h-[42px] max-h-[130px] focus:border-primary transition-all duration-200 placeholder:text-text-dim"
                />
            )}
        </div>
    );
}
