export interface User {
    id: string;
    displayName: string;
    avatar?: string | null;
    isGuest?: boolean;
}

export interface Workspace {
    id: string;
    name: string;
    ownerId: string;
    inviteCode?: string | null;
}

export interface Channel {
    id: string;
    name: string;
    workspaceId: string;
    topic?: string;
}

export type MessageType = 'text' | 'code';

export interface Message {
    id: string;
    channelId: string;
    user?: User;
    content: string;
    type: MessageType;
    language?: string;
    aiExplanation?: string | null;
    createdAt: string;
    editedAt?: string | null;
    _pending?: boolean;
    _failed?: boolean;
    _error?: string;
}

export interface TypingUser {
    userId: string;
    displayName?: string;
}

export interface OnlineUser {
    id: string;
    displayName: string;
    avatar?: string | null;
}
