import { User, Workspace, Channel, Message, AuthResponse, DemoResponse } from '@/types';

const API_BASE: string =
    (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')) ||
    '/api';

export class ApiError extends Error {
    status?: number;
    code?: string;
    details?: any;

    constructor(message: string, { status, code, details }: { status?: number; code?: string; details?: any } = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

export interface RequestOptions {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    signal?: AbortSignal;
}

export interface ExplainCodeStreamOptions {
    messageId?: string;
    code?: string;
    language?: string;
    onDelta?: (delta: string, full: string) => void;
    signal?: AbortSignal;
}

export interface StreamResult {
    result: Promise<{ text: string; full: string }>;
    cancel: () => void;
}

class ApiClient {
    token: string | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            this.token = localStorage.getItem('devchat_token');
        }
    }

    setToken(token: string | null): void {
        this.token = token;
        if (typeof window !== 'undefined') {
            if (token) localStorage.setItem('devchat_token', token);
            else localStorage.removeItem('devchat_token');
        }
    }

    clearToken(): void {
        this.token = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('devchat_token');
        }
    }

    async request<T = any>(path: string, { method = 'GET', body, headers = {}, signal }: RequestOptions = {}): Promise<T> {
        const finalHeaders: Record<string, string> = {
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
            ...headers,
        };

        const res = await fetch(`${API_BASE}${path}`, {
            method,
            headers: finalHeaders,
            body: body ? JSON.stringify(body) : undefined,
            signal,
        });

        let data: any = null;
        const text = await res.text();
        if (text) {
            try {
                data = JSON.parse(text);
            } catch {
                data = { error: text };
            }
        }

        if (!res.ok) {
            throw new ApiError(
                (data && data.error) || `Request failed (${res.status})`,
                { status: res.status, code: data && data.code, details: data && data.details }
            );
        }
        return data as T;
    }

    // Auth
    register(email: string, password: string, displayName: string): Promise<AuthResponse & { workspace: Workspace }> {
        return this.request<AuthResponse & { workspace: Workspace }>('/auth/register', {
            method: 'POST',
            body: { email, password, displayName },
        }).then((d) => {
            if (d.token) this.setToken(d.token);
            return d;
        });
    }

    login(email: string, password: string): Promise<AuthResponse> {
        return this.request<AuthResponse>('/auth/login', {
            method: 'POST',
            body: { email, password },
        }).then((d) => {
            if (d.token) this.setToken(d.token);
            return d;
        });
    }

    googleLogin(credential: string): Promise<AuthResponse> {
        return this.request<AuthResponse>('/auth/google', {
            method: 'POST',
            body: { credential },
        }).then((d) => {
            if (d.token) this.setToken(d.token);
            return d;
        });
    }

    getMe(): Promise<{ user: User; workspaces: Workspace[]; hasOpenaiKey?: boolean }> {
        return this.request<{ user: User; workspaces: Workspace[]; hasOpenaiKey?: boolean }>('/auth/me');
    }

    // Workspaces / channels / messages
    getWorkspaces(): Promise<Workspace[]> {
        return this.request<Workspace[]>('/workspaces');
    }

    getWorkspace(id: string): Promise<Workspace> {
        return this.request<Workspace>(`/workspaces/${id}`);
    }

    createWorkspace(name: string): Promise<Workspace> {
        return this.request<Workspace>('/workspaces', { method: 'POST', body: { name } });
    }

    joinWorkspace(inviteCode: string): Promise<Workspace> {
        return this.request<Workspace>('/workspaces/join', { method: 'POST', body: { inviteCode } });
    }

    getChannels(workspaceId: string): Promise<Channel[]> {
        return this.request<Channel[]>(`/channels/workspace/${workspaceId}`);
    }

    createChannel(workspaceId: string, name: string): Promise<Channel> {
        return this.request<Channel>('/channels', { method: 'POST', body: { workspaceId, name } });
    }

    deleteChannel(channelId: string): Promise<{ success: boolean }> {
        return this.request<{ success: boolean }>(`/channels/${channelId}`, { method: 'DELETE' });
    }

    getMessages(channelId: string, page: number = 1): Promise<{ messages: Message[]; total: number }> {
        return this.request<{ messages: Message[]; total: number }>(`/messages/channel/${channelId}?page=${page}`);
    }

    // Demo
    startDemo(): Promise<DemoResponse> {
        return this.request<DemoResponse>('/demo', { method: 'POST' });
    }

    // AI keys
    getKey(): Promise<{ hasKey: boolean; mask?: string | null; setAt?: string | null }> {
        return this.request<{ hasKey: boolean; mask?: string | null; setAt?: string | null }>('/keys');
    }

    setKey(apiKey: string): Promise<{ ok: boolean; mask?: string }> {
        return this.request<{ ok: boolean; mask?: string }>('/keys', { method: 'POST', body: { apiKey } });
    }

    deleteKey(): Promise<{ ok: boolean }> {
        return this.request<{ ok: boolean }>('/keys', { method: 'DELETE' });
    }

    testKey(): Promise<{ ok: boolean; reason?: string; mask?: string }> {
        return this.request<{ ok: boolean; reason?: string; mask?: string }>('/keys/test', { method: 'POST' });
    }

    // AI explain (streaming)
    explainCodeStream({ messageId, code, language, onDelta, signal }: ExplainCodeStreamOptions = {}): StreamResult {
        const ctrl = new AbortController();
        if (signal) signal.addEventListener('abort', () => ctrl.abort());
        const promise = (async () => {
            const res = await fetch(`${API_BASE}/ai/explain`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
                    Accept: 'text/event-stream',
                },
                body: JSON.stringify({ messageId, code, language }),
                signal: ctrl.signal,
            });
            if (!res.ok) {
                let data: any = null;
                try { data = await res.json(); } catch {}
                throw new ApiError(
                    (data && data.error) || `Request failed (${res.status})`,
                    { status: res.status, code: data && data.code }
                );
            }
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                const body = await res.json();
                if (body.explanation) {
                    if (onDelta) onDelta(body.explanation, body.explanation);
                }
                return { text: body.explanation || '', full: body.explanation || '' };
            }
            if (!res.body) {
                throw new ApiError('No response body', { status: 502 });
            }
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let full = '';
            let explanation = '';
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                let sep: number;
                while ((sep = buffer.indexOf('\n\n')) >= 0) {
                    const block = buffer.slice(0, sep);
                    buffer = buffer.slice(sep + 2);
                    const event: { event?: string; data?: string } = {};
                    for (const line of block.split('\n')) {
                        if (line.startsWith('event: ')) event.event = line.slice(7).trim();
                        else if (line.startsWith('data: ')) event.data = line.slice(6);
                    }
                    if (!event.data) continue;
                    let payload: any = null;
                    try { payload = JSON.parse(event.data); } catch { continue; }
                    if (event.event === 'delta' && payload.text) {
                        full += payload.text;
                        if (onDelta) onDelta(payload.text, full);
                    } else if (event.event === 'done') {
                        explanation = payload.explanation || full;
                    } else if (event.event === 'error') {
                        throw new ApiError(payload.error || 'AI error', { status: payload.status || 500 });
                    }
                }
            }
            return { text: explanation, full };
        })();
        return {
            result: promise,
            cancel: () => ctrl.abort(),
        };
    }

    async highlightCode(_code: string, _language: string): Promise<null> {
        return null;
    }
}

const api = new ApiClient();
export default api;
