// Backend base URL. In dev, this can be the local Express server; in
// prod, this is the deployed backend. The Next.js rewrite in
// next.config.js will proxy /api/* to this URL when served from Vercel.

const API_BASE =
    (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')) ||
    '/api';

class ApiError extends Error {
    constructor(message, { status, code, details } = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

class ApiClient {
    constructor() {
        this.token = null;
        if (typeof window !== 'undefined') {
            this.token = localStorage.getItem('devchat_token');
        }
    }

    setToken(token) {
        this.token = token;
        if (typeof window !== 'undefined') {
            if (token) localStorage.setItem('devchat_token', token);
            else localStorage.removeItem('devchat_token');
        }
    }

    clearToken() {
        this.token = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('devchat_token');
        }
    }

    async request(path, { method = 'GET', body, headers = {}, signal } = {}) {
        const finalHeaders = {
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

        let data = null;
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
        return data;
    }

    // --- Auth ---
    register(email, password, displayName) {
        return this.request('/auth/register', { method: 'POST', body: { email, password, displayName } })
            .then((d) => { this.setToken(d.token); return d; });
    }
    login(email, password) {
        return this.request('/auth/login', { method: 'POST', body: { email, password } })
            .then((d) => { this.setToken(d.token); return d; });
    }
    googleLogin(credential) {
        return this.request('/auth/google', { method: 'POST', body: { credential } })
            .then((d) => { this.setToken(d.token); return d; });
    }
    getMe() {
        return this.request('/auth/me');
    }

    // --- Workspaces / channels / messages ---
    getWorkspaces() { return this.request('/workspaces'); }
    getWorkspace(id) { return this.request(`/workspaces/${id}`); }
    createWorkspace(name) { return this.request('/workspaces', { method: 'POST', body: { name } }); }
    joinWorkspace(inviteCode) { return this.request('/workspaces/join', { method: 'POST', body: { inviteCode } }); }
    getChannels(workspaceId) { return this.request(`/channels/workspace/${workspaceId}`); }
    createChannel(workspaceId, name) { return this.request('/channels', { method: 'POST', body: { workspaceId, name } }); }
    deleteChannel(channelId) { return this.request(`/channels/${channelId}`, { method: 'DELETE' }); }
    getMessages(channelId, page = 1) { return this.request(`/messages/channel/${channelId}?page=${page}`); }

    // --- Demo ---
    startDemo() { return this.request('/demo', { method: 'POST' }); }

    // --- AI keys ---
    getKey() { return this.request('/keys'); }
    setKey(apiKey) { return this.request('/keys', { method: 'POST', body: { apiKey } }); }
    deleteKey() { return this.request('/keys', { method: 'DELETE' }); }
    testKey() { return this.request('/keys/test', { method: 'POST' }); }

    // --- AI explain (streaming) ---
    // Returns an object with .text() that yields each delta and resolves
    // with the full text, and .cancel() to abort. Throws ApiError on
    // non-2xx. This is the client side of the SSE endpoint in routes/ai.js.
    explainCodeStream({ messageId, code, language, onDelta, signal } = {}) {
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
                let data = null;
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
                let sep;
                while ((sep = buffer.indexOf('\n\n')) >= 0) {
                    const block = buffer.slice(0, sep);
                    buffer = buffer.slice(sep + 2);
                    const event = {};
                    for (const line of block.split('\n')) {
                        if (line.startsWith('event: ')) event.event = line.slice(7).trim();
                        else if (line.startsWith('data: ')) event.data = line.slice(6);
                    }
                    if (!event.data) continue;
                    let payload = null;
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

    // --- Cached explain (no stream) for the `highlightedHtml` preview. ---
    async highlightCode(code, language) {
        // We use the cache-hit path: send a small fake messageId-less
        // request, and if the server says "use Shiki directly on the
        // client" we just no-op. Today the server returns HTML on cache
        // hit, so the client has nothing to do here.
        return null;
    }
}

const api = new ApiClient();
export { ApiError };
export default api;
