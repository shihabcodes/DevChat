'use client';

// Supabase Realtime hooks replacing the old Socket.io server.
//   workspace:<id>  presence (who's online)
//   channel:<id>    new/edited/deleted messages + typing broadcasts
// Both topics are private: the database only lets members subscribe.

import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { OnlineUser, TypingUser, User } from '@/types';

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

const TYPING_TTL_MS = 5000;
const TYPING_THROTTLE_MS = 2000;

export function useWorkspacePresence(workspaceId: string | null, user: User | null): OnlineUser[] {
    const [online, setOnline] = useState<OnlineUser[]>([]);

    useEffect(() => {
        if (!workspaceId || !user) return;
        let channel: RealtimeChannel | null = null;
        let cancelled = false;

        (async () => {
            await supabase.realtime.setAuth();
            if (cancelled) return;
            channel = supabase.channel(`workspace:${workspaceId}`, {
                config: { private: true, presence: { key: user.id } },
            });
            channel
                .on('presence', { event: 'sync' }, () => {
                    const state = channel!.presenceState<OnlineUser>();
                    // One entry per user even with several tabs open.
                    setOnline(Object.values(state).map((metas) => metas[0]).filter(Boolean));
                })
                .subscribe((status, err) => {
                    if (err) console.warn(`[realtime] workspace:${workspaceId} ${status}`, err.message);
                    if (status === 'SUBSCRIBED') {
                        channel!.track({ id: user.id, displayName: user.displayName, avatar: user.avatar ?? null });
                    }
                });
        })();

        return () => {
            cancelled = true;
            if (channel) supabase.removeChannel(channel);
            setOnline([]);
        };
    }, [workspaceId, user]);

    return online;
}

interface ChannelEvents {
    onMessageInserted: (id: string) => void;
    onMessageUpdated: (id: string) => void;
    onMessageDeleted: (id: string) => void;
    /** Called when the subscription comes back after an error, to backfill missed messages. */
    onResync: () => void;
}

export function useChannelRealtime(channelId: string | null, user: User | null, events: ChannelEvents) {
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
    const [connection, setConnection] = useState<ConnectionState>('connecting');
    const channelRef = useRef<RealtimeChannel | null>(null);
    const lastTypingSent = useRef<number>(0);
    const eventsRef = useRef(events);
    eventsRef.current = events;

    useEffect(() => {
        if (!channelId || !user) return;
        let cancelled = false;
        let lostConnection = false;
        const expiry = new Map<string, ReturnType<typeof setTimeout>>();

        const dropTyping = (userId: string) => {
            clearTimeout(expiry.get(userId));
            expiry.delete(userId);
            setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
        };

        (async () => {
            await supabase.realtime.setAuth();
            if (cancelled) return;
            setConnection('connecting');
            const channel = supabase.channel(`channel:${channelId}`, {
                config: { private: true, broadcast: { self: false } },
            });
            channelRef.current = channel;

            channel
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
                    (payload) => {
                        const row = payload.new as { id: string; user_id: string };
                        dropTyping(row.user_id);
                        eventsRef.current.onMessageInserted(row.id);
                    })
                .on('postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
                    (payload) => eventsRef.current.onMessageUpdated((payload.new as { id: string }).id))
                // Supabase can't filter DELETE events (the old row only carries its id),
                // so listen to all deletes; ids we don't have are simply ignored.
                .on('postgres_changes',
                    { event: 'DELETE', schema: 'public', table: 'messages' },
                    (payload) => eventsRef.current.onMessageDeleted((payload.old as { id: string }).id))
                .on('broadcast', { event: 'typing' }, ({ payload }) => {
                    const { userId, displayName, typing } = payload as TypingUser & { typing: boolean };
                    if (!userId || userId === user.id) return;
                    if (!typing) return dropTyping(userId);
                    clearTimeout(expiry.get(userId));
                    expiry.set(userId, setTimeout(() => dropTyping(userId), TYPING_TTL_MS));
                    setTypingUsers((prev) =>
                        prev.some((u) => u.userId === userId) ? prev : [...prev, { userId, displayName }]);
                })
                .subscribe((status, err) => {
                    if (err) console.warn(`[realtime] channel:${channelId} ${status}`, err.message);
                    if (status === 'SUBSCRIBED') {
                        if (lostConnection) eventsRef.current.onResync();
                        lostConnection = false;
                        setConnection('connected');
                    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        // supabase-js rejoins on its own; we backfill once it does.
                        lostConnection = true;
                        setConnection('reconnecting');
                    } else if (status === 'CLOSED' && !cancelled) {
                        setConnection('disconnected');
                    }
                });
        })();

        return () => {
            cancelled = true;
            expiry.forEach(clearTimeout);
            setTypingUsers([]);
            if (channelRef.current) supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        };
    }, [channelId, user]);

    const sendTyping = (typing: boolean) => {
        if (!user || !channelRef.current) return;
        const now = Date.now();
        if (typing && now - lastTypingSent.current < TYPING_THROTTLE_MS) return;
        lastTypingSent.current = typing ? now : 0;
        channelRef.current.send({
            type: 'broadcast',
            event: 'typing',
            payload: { userId: user.id, displayName: user.displayName, typing },
        });
    };

    return { typingUsers, connection, sendTyping };
}
