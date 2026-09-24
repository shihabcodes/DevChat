// Browser helpers for the /api/ai routes. Requests carry the user's Supabase
// access token; the server verifies it and applies RLS as that user.

import { supabase } from './supabase';

export interface KeyInfo {
    hasKey: boolean;
    mask?: string | null;
    setAt?: string | null;
}

export class AiError extends Error {
    constructor(message: string, public status?: number, public code?: string) {
        super(message);
        this.name = 'AiError';
    }
}

async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new AiError('Please sign in again.', 401);
    return fetch(path, {
        ...init,
        headers: {
            ...(init.body ? { 'Content-Type': 'application/json' } : {}),
            Authorization: `Bearer ${session.access_token}`,
            ...init.headers,
        },
    });
}

async function json<T>(res: Response): Promise<T> {
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new AiError(body.error || `Request failed (${res.status})`, res.status, body.code);
    return body as T;
}

export const getKeyInfo = async () => json<KeyInfo>(await authedFetch('/api/ai/key'));

export const saveKey = async (apiKey: string) =>
    json<KeyInfo>(await authedFetch('/api/ai/key', { method: 'POST', body: JSON.stringify({ apiKey }) }));

export const removeKey = async () => json<KeyInfo>(await authedFetch('/api/ai/key', { method: 'DELETE' }));

/**
 * Explains a code message, calling onText with the full text so far as it
 * streams in. Resolves with the final explanation.
 */
export async function explainMessage(
    messageId: string,
    onText: (full: string) => void,
    signal?: AbortSignal,
): Promise<string> {
    const res = await authedFetch('/api/ai/explain', {
        method: 'POST',
        body: JSON.stringify({ messageId }),
        signal,
    });

    if (!res.ok || res.headers.get('content-type')?.includes('application/json')) {
        const { explanation } = await json<{ explanation: string }>(res);
        onText(explanation);
        return explanation;
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';
    for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sep: number;
        while ((sep = buffer.indexOf('\n\n')) >= 0) {
            const block = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            const event = /^event: (.*)$/m.exec(block)?.[1];
            const data = /^data: (.*)$/m.exec(block)?.[1];
            if (!event || !data) continue;
            const payload = JSON.parse(data);
            if (event === 'delta') {
                full += payload.text;
                onText(full);
            } else if (event === 'error') {
                throw new AiError(payload.error, undefined, payload.code);
            }
        }
    }
    return full;
}
