'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export interface KeyInfo {
    hasKey?: boolean;
    mask?: string | null;
    setAt?: string | null;
}

export interface TestResult {
    ok: boolean;
    reason?: string;
    mask?: string;
    message?: string;
}

interface AISettingsProps {
    open: boolean;
    onClose: () => void;
    onChange?: (info: KeyInfo) => void;
}

export default function AISettings({ open, onClose, onChange }: AISettingsProps) {
    const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null);
    const [draft, setDraft] = useState<string>('');
    const [testing, setTesting] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);
    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setError(null);
        setTestResult(null);
        setDraft('');
        api.getKey()
            .then(setKeyInfo)
            .catch((e: Error) => setError(e.message));
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    const handleSave = async () => {
        if (!draft.startsWith('sk-')) {
            setError('OpenAI keys start with "sk-"');
            return;
        }
        setError(null);
        setSaving(true);
        try {
            await api.setKey(draft);
            const info = await api.getKey();
            setKeyInfo(info);
            setDraft('');
            if (onChange) onChange(info);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        setError(null);
        try {
            const res = await api.testKey();
            setTestResult({ ok: res.ok, reason: res.reason, mask: res.mask });
        } catch (e: any) {
            setTestResult({ ok: false, reason: 'request_failed', message: e.message });
        } finally {
            setTesting(false);
        }
    };

    const handleRemove = async () => {
        if (!confirm('Remove your OpenAI key? You can add it again anytime.')) return;
        try {
            await api.deleteKey();
            const info = await api.getKey();
            setKeyInfo(info);
            setTestResult(null);
            if (onChange) onChange(info);
        } catch (e: any) {
            setError(e.message);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4 font-sans"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="w-full max-w-md bg-[#0c0c0e] border border-[#2e2e2e] rounded-2xl shadow-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#1f1f1f] flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-semibold text-white">AI Engine Settings</h2>
                        <p className="text-xs text-[#71717a] mt-0.5">Bring your own OpenAI key for in-line explanations</p>
                    </div>
                    <button onClick={onClose} className="text-[#71717a] hover:text-white text-base leading-none" aria-label="Close">✕</button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-[#52a8ff]/5 border border-[#52a8ff]/20">
                        <span className="text-sm mt-0.5">🔒</span>
                        <p className="text-xs text-[#a1a1a1] leading-relaxed">
                            Your key is <strong className="text-white">encrypted at rest with AES-256-GCM</strong> and used exclusively for your requests. Never logged or shared.
                        </p>
                    </div>

                    {keyInfo?.hasKey ? (
                        <div className="p-3 rounded-xl bg-[#141414] border border-[#2e2e2e]">
                            <div className="text-[10px] uppercase tracking-wider font-mono text-[#71717a] mb-1">Active Key</div>
                            <div className="font-mono text-[#10b981] text-xs">{keyInfo.mask}</div>
                            {keyInfo.setAt && (
                                <div className="text-[10px] text-[#565656] mt-1">Configured on {new Date(keyInfo.setAt).toLocaleDateString()}</div>
                            )}
                        </div>
                    ) : (
                        <div className="p-3 rounded-xl bg-[#ef4444]/5 border border-[#ef4444]/20">
                            <div className="text-[10px] uppercase tracking-wider font-mono text-[#f87171] mb-1">No API Key Configured</div>
                            <div className="text-xs text-[#a1a1a1]">Add your OpenAI key below to enable streaming code explanations.</div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-[#71717a] mb-1.5">
                            OpenAI API Key
                        </label>
                        <input
                            type="password"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="sk-proj-..."
                            autoComplete="off"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-[#2e2e2e] bg-[#141414] text-white text-xs font-mono outline-none focus:border-[#52a8ff] transition-colors"
                        />
                        <a
                            href="https://platform.openai.com/api-keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-1.5 text-[11px] font-mono text-[#52a8ff] hover:underline"
                        >
                            Get an OpenAI API key →
                        </a>
                    </div>

                    {error && (
                        <div className="px-3 py-2 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#fca5a5] text-xs">
                            {error}
                        </div>
                    )}

                    {testResult && (
                        <div className={`px-3 py-2 rounded-lg text-xs font-mono ${
                            testResult.ok
                                ? 'bg-[#10b981]/10 border border-[#10b981]/30 text-[#86efac]'
                                : 'bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#fca5a5]'
                        }`}>
                            {testResult.ok
                                ? `✓ Key verified${testResult.mask ? ` (${testResult.mask})` : ''}`
                                : testResult.reason === 'invalid_key'
                                    ? '✗ OpenAI rejected the key. Verify and re-enter.'
                                    : `✗ ${testResult.message || testResult.reason || 'Verification failed'}`}
                        </div>
                    )}

                    <div className="flex gap-2 pt-1">
                        <button
                            onClick={handleSave}
                            disabled={saving || !draft}
                            className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-white text-black hover:bg-[#e8e8e8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Saving…' : (keyInfo?.hasKey ? 'Replace key' : 'Save key')}
                        </button>
                        {keyInfo?.hasKey && (
                            <>
                                <button
                                    onClick={handleTest}
                                    disabled={testing}
                                    className="px-3.5 py-2.5 rounded-xl text-xs font-mono border border-[#2e2e2e] text-[#a1a1a1] hover:text-white hover:border-[#3a3a3a] disabled:opacity-50"
                                >
                                    {testing ? 'Testing…' : 'Test'}
                                </button>
                                <button
                                    onClick={handleRemove}
                                    className="px-3.5 py-2.5 rounded-xl text-xs font-mono border border-[#ef4444]/40 text-[#f87171] hover:bg-[#ef4444]/10"
                                >
                                    Remove
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
