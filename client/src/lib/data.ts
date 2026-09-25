// Data access for DevChat. Every call runs as the signed-in user, and RLS in
// the database decides what they can see or change. Nothing here is trusted
// for authorization.

import type { PostgrestError, AuthError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Channel, Message, MessageType, User, Workspace } from '@/types';

const MESSAGE_PAGE_SIZE = 50;
const MESSAGE_SELECT =
    'id, channel_id, type, language, content, created_at, edited_at, ' +
    'author:profiles(id, display_name, avatar_url), explanation:message_explanations(content)';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class DataError extends Error {
    code?: string;
    constructor(message: string, code?: string) {
        super(message);
        this.name = 'DataError';
        this.code = code;
    }
}

const FRIENDLY: Record<string, string> = {
    P0429: 'Slow down: you are sending messages too fast.',
    P0002: 'That invite code is not valid.',
    '42501': "You don't have permission to do that.",
    '23505': 'That name is already taken here.',
    '23514': 'That value is not allowed (check its length and characters).',
};

function fail(err: PostgrestError | AuthError | null): never | void {
    if (!err) return;
    const code = 'code' in err ? (err.code as string | undefined) : undefined;
    throw new DataError((code && FRIENDLY[code]) || err.message, code);
}

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

type ProfileRow = { id: string; display_name: string; avatar_url: string | null };

function toUser(p: ProfileRow, isGuest = false): User {
    return { id: p.id, displayName: p.display_name, avatar: p.avatar_url, isGuest };
}

type MessageRow = {
    id: string;
    channel_id: string;
    type: string;
    language: string;
    content: string;
    created_at: string;
    edited_at: string | null;
    author: ProfileRow | null;
    explanation: { content: string } | null;
};

export function toMessage(row: MessageRow): Message {
    return {
        id: row.id,
        channelId: row.channel_id,
        type: row.type as MessageType,
        language: row.language,
        content: row.content,
        createdAt: row.created_at,
        editedAt: row.edited_at,
        user: row.author ? toUser(row.author) : undefined,
        aiExplanation: row.explanation?.content ?? null,
    };
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function signUp(email: string, password: string, displayName: string) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
        },
    });
    fail(error);
    // With email confirmation on, there is no session until the link is clicked.
    return { needsConfirmation: !data.session };
}

export async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    fail(error);
}

export async function signInWithGoogleIdToken(idToken: string) {
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
    fail(error);
}

export async function signOut() {
    await supabase.auth.signOut();
}

/** The signed-in user with their profile, or null when signed out. */
export async function getCurrentUser(): Promise<User | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .eq('id', session.user.id)
        .maybeSingle();
    fail(error);
    if (!data) return null;
    return toUser(data, Boolean(session.user.is_anonymous));
}

// ---------------------------------------------------------------------------
// Workspaces
// ---------------------------------------------------------------------------

export async function listMyWorkspaces(): Promise<Workspace[]> {
    const { data, error } = await supabase
        .from('workspaces')
        .select('id, name, owner_id')
        .order('created_at', { ascending: true });
    fail(error);
    return (data ?? []).map((w) => ({ id: w.id, name: w.name, ownerId: w.owner_id }));
}

export async function createWorkspace(name: string): Promise<Workspace> {
    const { data, error } = await supabase.rpc('create_workspace', { p_name: name });
    fail(error);
    return { id: data!.id, name: data!.name, ownerId: data!.owner_id };
}

export async function joinWorkspace(inviteCode: string): Promise<Workspace> {
    const { data, error } = await supabase.rpc('join_workspace', { p_code: inviteCode.trim() });
    fail(error);
    return { id: data!.id, name: data!.name, ownerId: data!.owner_id };
}

/** First workspace the user belongs to, creating a personal one if they have none. */
export async function ensureWorkspace(user: User): Promise<Workspace> {
    const existing = await listMyWorkspaces();
    if (existing.length > 0) return existing[0];
    return createWorkspace(`${user.displayName}'s Workspace`.slice(0, 60));
}

/** Returns null when the workspace doesn't exist or the user isn't a member. */
export async function getWorkspace(id: string): Promise<Workspace | null> {
    const { data, error } = await supabase
        .from('workspaces')
        .select('id, name, owner_id')
        .eq('id', id)
        .maybeSingle();
    fail(error);
    if (!data) return null;
    // Only owners/admins can read the invite code; RLS returns no row otherwise.
    const { data: invite } = await supabase
        .from('workspace_invites')
        .select('code')
        .eq('workspace_id', id)
        .maybeSingle();
    return { id: data.id, name: data.name, ownerId: data.owner_id, inviteCode: invite?.code ?? null };
}

// ---------------------------------------------------------------------------
// Channels
// ---------------------------------------------------------------------------

export function normalizeChannelName(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '').slice(0, 40);
}

export async function listChannels(workspaceId: string): Promise<Channel[]> {
    const { data, error } = await supabase
        .from('channels')
        .select('id, name, description, workspace_id')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true });
    fail(error);
    return (data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        workspaceId: c.workspace_id,
        topic: c.description || undefined,
    }));
}

export async function createChannel(workspaceId: string, userId: string, rawName: string): Promise<Channel> {
    const name = normalizeChannelName(rawName);
    if (!name) throw new DataError('Channel names can use letters, numbers, - and _.');
    const { data, error } = await supabase
        .from('channels')
        .insert({ workspace_id: workspaceId, name, created_by: userId })
        .select('id, name, description, workspace_id')
        .single();
    fail(error);
    return { id: data!.id, name: data!.name, workspaceId: data!.workspace_id, topic: data!.description || undefined };
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/** The most recent messages in a channel, oldest first. */
export async function listRecentMessages(channelId: string): Promise<Message[]> {
    const { data, error } = await supabase
        .from('messages')
        .select(MESSAGE_SELECT)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(MESSAGE_PAGE_SIZE);
    fail(error);
    return ((data ?? []) as unknown as MessageRow[]).map(toMessage).reverse();
}

export async function getMessage(id: string): Promise<Message | null> {
    const { data, error } = await supabase.from('messages').select(MESSAGE_SELECT).eq('id', id).maybeSingle();
    fail(error);
    return data ? toMessage(data as unknown as MessageRow) : null;
}

export async function sendMessage(
    channelId: string,
    userId: string,
    content: string,
    type: MessageType,
    language = ''
): Promise<Message> {
    const { data, error } = await supabase
        .from('messages')
        .insert({
            channel_id: channelId,
            user_id: userId,
            content,
            type,
            language: type === 'code' ? language.slice(0, 40) : '',
        })
        .select(MESSAGE_SELECT)
        .single();
    fail(error);
    return toMessage(data as unknown as MessageRow);
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

const DEMO_SNIPPET = `function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

window.addEventListener('resize', debounce(() => {
  console.log('resized', window.innerWidth);
}, 150));`;

/**
 * Signs in as a temporary guest (purged after 24h), creates a demo workspace
 * and seeds #general with a few messages. Returns the workspace id.
 */
export async function startDemo(): Promise<string> {
    const tag = Math.random().toString(36).slice(2, 6).toUpperCase();
    const { data, error } = await supabase.auth.signInAnonymously({
        options: { data: { display_name: `Guest-${tag}` } },
    });
    fail(error);
    const userId = data.user!.id;

    const workspace = await createWorkspace('Demo Workspace');
    const [general] = await listChannels(workspace.id);

    await sendMessage(general.id, userId,
        '👋 Welcome to DevChat! This is a private demo workspace that disappears after 24 hours.', 'text');
    await sendMessage(general.id, userId, DEMO_SNIPPET, 'code', 'javascript');
    await sendMessage(general.id, userId,
        '💡 Click **Explain** on the snippet above, post your own with **Share code**, or open this workspace in a second window to watch messages arrive live.', 'text');

    return workspace.id;
}
