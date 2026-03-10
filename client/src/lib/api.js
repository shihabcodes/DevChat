const API_BASE = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : '/api';

class ApiClient {
    constructor() {
        this.token = typeof window !== 'undefined' ? localStorage.getItem('devchat_token') : null;
    }

    setToken(token) {
        this.token = token;
        if (typeof window !== 'undefined') {
            localStorage.setItem('devchat_token', token);
        }
    }

    clearToken() {
        this.token = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('devchat_token');
        }
    }

    async request(path, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
            ...options.headers,
        };

        const res = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers,
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    }

    async register(email, password, displayName) {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, displayName }),
        });
        this.setToken(data.token);
        return data;
    }

    async login(email, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        this.setToken(data.token);
        return data;
    }

    async getMe() {
        return this.request('/auth/me');
    }

    async getWorkspaces() {
        return this.request('/workspaces');
    }

    async getWorkspace(id) {
        return this.request(`/workspaces/${id}`);
    }

    async createWorkspace(name) {
        return this.request('/workspaces', {
            method: 'POST',
            body: JSON.stringify({ name }),
        });
    }

    async joinWorkspace(inviteCode) {
        return this.request('/workspaces/join', {
            method: 'POST',
            body: JSON.stringify({ inviteCode }),
        });
    }

    async getChannels(workspaceId) {
        return this.request(`/channels/workspace/${workspaceId}`);
    }

    async createChannel(workspaceId, name) {
        return this.request('/channels', {
            method: 'POST',
            body: JSON.stringify({ workspaceId, name }),
        });
    }

    async deleteChannel(channelId) {
        return this.request(`/channels/${channelId}`, { method: 'DELETE' });
    }

    async getMessages(channelId, page = 1) {
        return this.request(`/messages/channel/${channelId}?page=${page}`);
    }

    async explainCode(messageId, code, language) {
        return this.request('/ai/explain', {
            method: 'POST',
            body: JSON.stringify({ messageId, code, language }),
        });
    }
}

const api = new ApiClient();
export default api;
