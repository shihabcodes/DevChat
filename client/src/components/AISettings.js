'use client';

import { useEffect, useState } from 'react';
import api, { ApiError } from '@/lib/api';

export default function AISettings({ open, onClose, onChange }) {
    const [keyInfo, setKeyInfo] = useState(null);
    const [draft, setDraft] = useState('');
    const [testing, setTesting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!open) return;
        setError(null);
        setTestResult(null);
        setDraft('');
        api.getKey()
            .then(setKeyInfo)
            .catch((e) => setError(e.message));
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
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
        } catch (e) {
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
        } catch (e) {
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
        } catch (e) {
            setError(e.message);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="w-full max-w-md bg-[#12122A] border border-[#2D2D5E] rounded-2xl shadow-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#2D2D5E] flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-[#F9FAFB]">AI Settings</h2>
                        <p className="text-xs text-[#6B7280] mt-0.5">DevChat uses your own OpenAI key for explanations</p>
                    </div>
                    <button onClick={onClose} className="text-[#6B7280] hover:text-white text-xl leading-none" aria-label="Close">×</button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-[rgba(79,70,229,0.06)] border border-[rgba(79,70,229,0.18)]">
                        <span className="text-base mt-0.5">🔒</span>
                        <p className="text-[0.75rem] text-[#D1D5DB] leading-relaxed">
                            Your key is <strong>encrypted at rest</strong> with AES-256-GCM and used only to call OpenAI on your behalf. We never log it, share it, or use it for anything else.
                        </p>
                    </div>

                    {keyInfo?.hasKey ? (
                        <div className="p-3 rounded-lg bg-[#1A1A3E] border border-[#2D2D5E]">
                            <div className="text-[0.7rem] uppercase tracking-wider text-[#6B7280] mb-1">Current key</div>
                            <div className="font-['JetBrains_Mono',monospace] text-[#16A34A] text-sm">{keyInfo.mask}</div>
                            {keyInfo.setAt && (
                                <div className="text-[0.7rem] text-[#6B7280] mt-1">Added {new Date(keyInfo.setAt).toLocaleString()}</div>
                            )}
                        </div>
                    ) : (
                        <div className="p-3 rounded-lg bg-[rgba(220,38,38,0.06)] border border-[rgba(220,38,38,0.2)]">
                            <div className="text-[0.7rem] uppercase tracking-wider text-[#FCA5A5] mb-1">No key configured</div>
                            <div className="text-[0.75rem] text-[#D1D5DB]">Add a key below to enable AI explanations.</div>
                        </div>
                    )}

                    <div>
                        <label className="block text-[0.75rem] text-[#9CA3AF] mb-1.5 font-medium">
                            OpenAI API Key
                        </label>
                        <input
                            type="password"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="sk-..."
                            autoComplete="off"
                            className="w-full px-3.5 py-2.5 rounded-lg border border-[#2D2D5E] bg-[#13132E] text-[#F9FAFB] text-sm font-['JetBrains_Mono',monospace] outline-none focus:border-[#4F46E5] transition-colors"
                        />
                        <a
                            href="https://platform.openai.com/api-keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-1.5 text-[0.7rem] text-[#06B6D4] hover:underline"
                        >
                            Get your key at platform.openai.com →
                        </a>
                    </div>

                    {error && (
                        <div className="px-3 py-2 rounded-md bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.3)] text-[#FCA5A5] text-xs">
                            {error}
                        </div>
                    )}

                    {testResult && (
                        <div className={`px-3 py-2 rounded-md text-xs ${
                            testResult.ok
                                ? 'bg-[rgba(22,163,74,0.1)] border border-[rgba(22,163,74,0.3)] text-[#86EFAC]'
                                : 'bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.3)] text-[#FCA5A5]'
                        }`}>
                            {testResult.ok
                                ? `✓ Key works${testResult.mask ? ` (${testResult.mask})` : ''}`
                                : testResult.reason === 'invalid_key'
                                    ? '✗ OpenAI rejected the key. Check it and try again.'
                                    : testResult.reason === 'decrypt_failed'
                                        ? '✗ Stored key could not be decrypted. Re-add it.'
                                        : `✗ ${testResult.message || testResult.reason || 'Test failed'}`}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            disabled={saving || !draft}
                            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                background: saving || !draft ? '#3730A3' : 'linear-gradient(135deg, #4F46E5, #6366F1)',
                                boxShadow: '0 4px 16px rgba(79,70,229,0.3)',
                            }}
                        >
                            {saving ? 'Saving…' : (keyInfo?.hasKey ? 'Replace key' : 'Add key')}
                        </button>
                        {keyInfo?.hasKey && (
                            <>
                                <button
                                    onClick={handleTest}
                                    disabled={testing}
                                    className="px-4 py-2 rounded-lg text-sm font-semibold border border-[#2D2D5E] text-[#9CA3AF] hover:text-white hover:border-[#3D3D6E] disabled:opacity-50"
                                >
                                    {testing ? 'Testing…' : 'Test'}
                                </button>
                                <button
                                    onClick={handleRemove}
                                    className="px-4 py-2 rounded-lg text-sm font-semibold border border-[rgba(220,38,38,0.4)] text-[#FCA5A5] hover:bg-[rgba(220,38,38,0.1)]"
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
