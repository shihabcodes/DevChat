export interface User {
    _id: string;
    email?: string;
    displayName?: string;
    avatar?: string;
    hasApiKey?: boolean;
    role?: string;
}

export interface Channel {
    _id: string;
    name: string;
    workspaceId?: string;
    topic?: string;
    createdAt?: string;
}

export interface Workspace {
    _id: string;
    name: string;
    owner?: string | User;
    inviteCode?: string;
    channels?: Channel[];
    members?: User[];
    createdAt?: string;
}

export interface MessageUser {
    _id?: string;
    displayName?: string;
    avatar?: string;
}

export interface Message {
    _id: string;
    channelId?: string;
    channel?: string;
    sender?: User | string;
    user?: MessageUser | User;
    content?: string;
    code?: string;
    type?: string;
    language?: string;
    aiExplanation?: string;
    createdAt?: string;
    optimistic?: boolean;
    _pending?: boolean;
    _failed?: boolean;
    _tempId?: string;
}

export interface TypingUser {
    userId: string;
    displayName?: string;
    channelId?: string;
}

export interface OnlineUser {
    _id?: string;
    displayName: string;
    avatar?: string;
}

export interface AIStreamResponse {
    delta?: string;
    full?: string;
    text?: string;
}

export interface AuthResponse {
    token?: string;
    user?: User;
    workspace?: Workspace;
    workspaces?: Workspace[];
    hasOpenaiKey?: boolean;
}

export interface DemoResponse {
    token: string;
    user: User;
    workspace: Workspace;
    channel: Channel;
    messages: Message[];
}
