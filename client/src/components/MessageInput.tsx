'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const LANGUAGES = [
    'javascript', 'typescript', 'python', 'rust', 'go', 'sql', 'bash',
    'json', 'html', 'css', 'yaml', 'c', 'cpp', 'java', 'markdown',
];

export interface MessageInputProps {
    onSend: (content: string, type?: 'text' | 'code', language?: string) => void;
    onTyping?: () => void;
    onStopTyping?: () => void;
    disabled?: boolean;
}

export default function MessageInput({
    onSend,
    onTyping,
    onStopTyping,
    disabled = false,
}: MessageInputProps) {
    const [content, setContent] = useState<string>('');
    const [codeMode, setCodeMode] = useState<boolean>(false);
    const [language, setLanguage] = useState<string>('typescript');
    const [codeContent, setCodeContent] = useState<string>('');
    const inputRef = useRef<HTMLTextAreaElement | null>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!codeMode && inputRef.current) {
            inputRef.current.focus();
        }
    }, [codeMode]);

    const handleTyping = () => {
        onTyping?.();
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            onStopTyping?.();
        }, 2000);
    };

    const handleSend = useCallback(() => {
        if (codeMode) {
            const trimmed = codeContent.trim();
            if (trimmed) {
                onSend(trimmed, 'code', language);
                setCodeContent('');
                setCodeMode(false);
            }
        } else {
            const trimmed = content.trim();
            if (trimmed) {
                onSend(trimmed, 'text');
                setContent('');
                if (inputRef.current) inputRef.current.style.height = 'auto';
            }
        }
        onStopTyping?.();
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }, [codeMode, codeContent, content, language, onSend, onStopTyping]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !codeMode) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
        handleTyping();
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
    };

    return (
        <div className="border-t border-[#1f1f1f] p-3.5 bg-[#080809] flex flex-col gap-2.5 z-10 font-sans">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCodeMode(!codeMode)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-colors border ${
                            codeMode
                                ? 'border-[#52a8ff]/40 bg-[#52a8ff]/15 text-[#52a8ff]'
                                : 'border-[#2e2e2e] bg-[#141414] text-[#a1a1a1] hover:text-white hover:border-[#3a3a3a]'
                        }`}
                    >
                        <span>&lt;/&gt;</span>
                        <span>{codeMode ? 'Code Mode Active' : 'Share Code'}</span>
                    </button>

                    {codeMode && (
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="px-2 py-1 rounded-md border border-[#2e2e2e] bg-[#141414] text-[#52a8ff] text-xs font-mono outline-none cursor-pointer focus:border-[#52a8ff]"
                        >
                            {LANGUAGES.map((lang) => (
                                <option key={lang} value={lang}>{lang}</option>
                            ))}
                        </select>
                    )}
                </div>

                <button
                    onClick={handleSend}
                    disabled={disabled || (codeMode ? !codeContent.trim() : !content.trim())}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-white text-black hover:bg-[#e8e8e8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <span>Send</span>
                    <span className="text-[10px] text-[#71717a] font-mono">{codeMode ? '⌘↵' : '↵'}</span>
                </button>
            </div>

            {codeMode ? (
                <div className="rounded-xl overflow-hidden border border-[#1f1f1f] bg-[#0c0c0e] h-[190px]">
                    <MonacoEditor
                        height="190px"
                        language={language}
                        value={codeContent}
                        onChange={(val) => {
                            setCodeContent(val || '');
                            handleTyping();
                        }}
                        onMount={(editor, monaco) => {
                            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                                handleSend();
                            });
                        }}
                        theme="vs-dark"
                        options={{
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            fontSize: 12,
                            fontFamily: 'Geist Mono, JetBrains Mono, monospace',
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
                    onChange={handleTextChange}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    placeholder={disabled ? 'Reconnecting to network...' : 'Message channel... (Enter to send, Shift+Enter for new line)'}
                    rows={1}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#1f1f1f] bg-[#0e0e10] text-[#ededed] text-xs outline-none resize-none min-h-[38px] max-h-[140px] focus:border-[#52a8ff] transition-colors placeholder:text-[#565656]"
                />
            )}
        </div>
    );
}
