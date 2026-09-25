'use client';

import { useEffect, useState } from 'react';
import { getKeyInfo, removeKey, saveKey, type KeyInfo } from '@/lib/ai';
import { KeyIcon, LockIcon, XIcon } from './ui/icons';

interface AISettingsProps {
    open: boolean;
    onClose: () => void;
    onChange?: (info: KeyInfo) => void;
}

export default function AISettings({ open, onClose, onChange }: AISettingsProps) {
    const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null);
    const [draft, setDraft] = useState('');
    const [saving, setSaving] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setError(null);
        setConfirmRemove(false);
        setDraft('');
        getKeyInfo().then(setKeyInfo).catch((e: Error) => setError(e.message));
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');

    // The server checks the key with OpenAI before saving it.
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = draft.trim();
        if (!trimmed.startsWith('sk-')) {
            setError('OpenAI keys start with "sk-".');
            return;
        }
        setError(null);
        setSaving(true);
        try {
            const info = await saveKey(trimmed);
            setKeyInfo({ ...info, setAt: new Date().toISOString() });
            setDraft('');
            onChange?.(info);
        } catch (err) {
            setError(errorText(err));
        } finally {
            setSaving(false);
        }
    };

    const handleRemove = async () => {
        if (!confirmRemove) {
            setConfirmRemove(true);
            return;
        }
        try {
            const info = await removeKey();
            setKeyInfo(info);
            setConfirmRemove(false);
            onChange?.(info);
        } catch (err) {
            setError(errorText(err));
        }
    };

    return (
        <div
            className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div role="dialog" aria-modal="true" aria-labelledby="ai-settings-title" className="w-full max-w-md rounded-2xl border border-line-strong bg-surface shadow-2xl shadow-black/60">
                <div className="flex items-start justify-between gap-4 px-5 pt-5">
                    <div>
                        <h2 id="ai-settings-title" className="flex items-center gap-2 text-base font-semibold">
                            <KeyIcon size={16} className="text-accent" /> AI key
                        </h2>
                        <p className="mt-1 text-sm text-fg-muted">
                            Explanations use your own OpenAI key, so you only pay for what you ask.
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="icon-btn -mr-1 -mt-1" aria-label="Close">
                        <XIcon size={16} />
                    </button>
                </div>

                <form onSubmit={handleSave} className="space-y-4 p-5">
                    <div className="rounded-xl border border-line bg-bg px-3.5 py-3">
                        {keyInfo?.hasKey ? (
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs text-fg-subtle">Connected key</p>
                                    <p className="mt-0.5 font-mono text-sm">{keyInfo.mask}</p>
                                </div>
                                <span className="inline-flex items-center gap-1.5 text-xs text-success">
                                    <span className="h-1.5 w-1.5 rounded-full bg-success" /> Active
                                </span>
                            </div>
                        ) : (
                            <p className="text-sm text-fg-muted">{keyInfo ? 'No key yet.' : 'Checking…'}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="openai-key" className="mb-1.5 block text-[13px] font-medium">
                            {keyInfo?.hasKey ? 'Replace key' : 'OpenAI API key'}
                        </label>
                        <input
                            id="openai-key"
                            type="password"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="sk-proj-…"
                            autoComplete="off"
                            spellCheck={false}
                            className="input font-mono"
                        />
                        <a
                            href="https://platform.openai.com/api-keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1.5 inline-block text-xs text-fg-subtle underline-offset-2 hover:text-fg hover:underline"
                        >
                            Get a key from OpenAI →
                        </a>
                    </div>

                    {error && <p className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-[#ffb3b5]">{error}</p>}

                    <p className="flex items-start gap-2 text-xs leading-relaxed text-fg-subtle">
                        <LockIcon size={13} className="mt-0.5 shrink-0" />
                        Verified with OpenAI, encrypted with AES-256-GCM on the server, and never sent back to your browser.
                    </p>

                    <div className="flex items-center justify-end gap-2 pt-1">
                        {keyInfo?.hasKey && (
                            <button type="button" onClick={handleRemove} className={`btn btn-sm ${confirmRemove ? 'text-danger hover:bg-danger-soft' : 'btn-ghost'}`}>
                                {confirmRemove ? 'Click again to remove' : 'Remove key'}
                            </button>
                        )}
                        <button type="submit" disabled={saving || !draft.trim()} className="btn btn-sm btn-primary">
                            {saving ? 'Verifying…' : 'Verify & save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
