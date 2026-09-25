'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { CodeIcon, SendIcon } from './ui/icons';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
    ssr: false,
    loading: () => <div className="flex h-full items-center justify-center text-xs text-fg-subtle">Loading editor…</div>,
});

const LANGUAGES = [
    'typescript', 'javascript', 'python', 'rust', 'go', 'sql', 'bash',
    'json', 'html', 'css', 'yaml', 'c', 'cpp', 'java', 'markdown',
];

export interface MessageInputProps {
    onSend: (content: string, type?: 'text' | 'code', language?: string) => void;
    onTyping?: () => void;
    onStopTyping?: () => void;
    disabled?: boolean;
    placeholder?: string;
    /** Focus the text box on mount (off for the landing-page preview, so the page doesn't jump). */
    autoFocus?: boolean;
}

export default function MessageInput({ onSend, onTyping, onStopTyping, disabled = false, placeholder, autoFocus = true }: MessageInputProps) {
    const [content, setContent] = useState('');
    const [codeMode, setCodeMode] = useState(false);
    const [language, setLanguage] = useState('typescript');
    const [codeContent, setCodeContent] = useState('');
    const inputRef = useRef<HTMLTextAreaElement | null>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Focus on mount (if asked) and when leaving code mode, never just because an effect re-ran.
    const prevCodeMode = useRef(codeMode);
    useEffect(() => {
        const leftCodeMode = prevCodeMode.current && !codeMode;
        prevCodeMode.current = codeMode;
        if (!codeMode && (leftCodeMode || autoFocus)) inputRef.current?.focus();
    }, [codeMode, autoFocus]);

    const handleTyping = () => {
        onTyping?.();
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => onStopTyping?.(), 2000);
    };

    const handleSend = useCallback(() => {
        if (disabled) return;
        if (codeMode) {
            const trimmed = codeContent.trim();
            if (!trimmed) return;
            onSend(trimmed, 'code', language);
            setCodeContent('');
            setCodeMode(false);
        } else {
            const trimmed = content.trim();
            if (!trimmed) return;
            onSend(trimmed, 'text');
            setContent('');
            if (inputRef.current) inputRef.current.style.height = 'auto';
        }
        onStopTyping?.();
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }, [disabled, codeMode, codeContent, content, language, onSend, onStopTyping]);

    // Monaco captures its keybinding once, so route it through a ref to the latest handler.
    const sendRef = useRef(handleSend);
    sendRef.current = handleSend;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
        handleTyping();
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
    };

    const canSend = !disabled && (codeMode ? codeContent.trim() : content.trim());

    return (
        <div className="shrink-0 px-4 pb-4 md:px-5">
            <div className="rounded-xl border border-line-strong bg-surface transition-colors focus-within:border-fg-subtle">
                {codeMode ? (
                    <div className="h-[200px] overflow-hidden rounded-t-xl pt-2">
                        <MonacoEditor
                            height="100%"
                            language={language}
                            value={codeContent}
                            onChange={(val) => {
                                setCodeContent(val || '');
                                handleTyping();
                            }}
                            beforeMount={(monaco) => {
                                monaco.editor.defineTheme('devchat', {
                                    base: 'vs-dark',
                                    inherit: true,
                                    rules: [],
                                    colors: {
                                        'editor.background': '#141416',
                                        'editor.lineHighlightBackground': '#1b1b1e',
                                        'editorLineNumber.foreground': '#4a4a52',
                                        'editorLineNumber.activeForeground': '#a0a0a8',
                                        'editorCursor.foreground': '#ffb224',
                                        'editor.selectionBackground': '#ffb22433',
                                        'editorIndentGuide.background1': '#232327',
                                    },
                                });
                            }}
                            onMount={(editor, monaco) => {
                                editor.focus(); // only mounts after the user switches to code mode
                                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => sendRef.current());
                            }}
                            theme="devchat"
                            options={{
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                fontSize: 13,
                                fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                                lineNumbers: 'on',
                                lineNumbersMinChars: 3,
                                automaticLayout: true,
                                overviewRulerBorder: false,
                                hideCursorInOverviewRuler: true,
                                renderLineHighlight: 'line',
                                scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
                                padding: { top: 4, bottom: 8 },
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
                        placeholder={placeholder ?? 'Write a message'}
                        rows={1}
                        aria-label="Message"
                        className="block max-h-[180px] min-h-[46px] w-full resize-none bg-transparent focus-visible:outline-none px-3.5 pb-1 pt-3 text-[14.5px] text-fg outline-none placeholder:text-fg-subtle disabled:opacity-50"
                    />
                )}

                <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1">
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setCodeMode((v) => !v)}
                            aria-pressed={codeMode}
                            className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors ${
                                codeMode ? 'bg-accent-soft text-accent' : 'text-fg-subtle hover:bg-elevated hover:text-fg'
                            }`}
                        >
                            <CodeIcon size={15} />
                            {codeMode ? 'Code' : 'Share code'}
                        </button>
                        {codeMode && (
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                aria-label="Language"
                                className="h-7 cursor-pointer rounded-md border border-line bg-bg px-1.5 font-mono text-xs text-fg-muted outline-none hover:text-fg"
                            >
                                {LANGUAGES.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
                            </select>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="hidden text-[11px] text-fg-subtle sm:inline">
                            {codeMode ? <><span className="kbd">⌘</span> <span className="kbd">↵</span> to send</> : <><span className="kbd">↵</span> send · <span className="kbd">⇧</span> <span className="kbd">↵</span> new line</>}
                        </span>
                        <button
                            type="button"
                            onClick={handleSend}
                            disabled={!canSend}
                            aria-label="Send message"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-fg text-bg transition-opacity disabled:opacity-25"
                        >
                            <SendIcon size={15} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
