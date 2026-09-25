'use client';

// The landing-page preview renders the real app components with sample data.
// Visitors can type into it; messages stay local and nothing hits the network.

import { useMemo, useState } from 'react';
import ChatArea from '@/components/ChatArea';
import MessageInput from '@/components/MessageInput';
import Sidebar from '@/components/Sidebar';
import type { Channel, Message, OnlineUser, User } from '@/types';

const maya: User = { id: 'preview-maya', displayName: 'Maya Chen' };
const leo: User = { id: 'preview-leo', displayName: 'Leo Park' };
const you: User = { id: 'preview-you', displayName: 'You' };

const channels: Channel[] = [
    { id: 'preview-general', name: 'general', workspaceId: 'preview', topic: 'Code review & questions' },
    { id: 'preview-backend', name: 'backend', workspaceId: 'preview' },
    { id: 'preview-ship', name: 'ship-it', workspaceId: 'preview' },
];

const online: OnlineUser[] = [maya, leo, you].map((u) => ({ id: u.id, displayName: u.displayName }));

const RETRY_SNIPPET = `export async function withRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i >= attempts - 1) throw err;
      const delay = Math.min(1000 * 2 ** i, 15_000);
      await new Promise((r) => setTimeout(r, delay + Math.random() * 250));
    }
  }
}`;

const RETRY_EXPLANATION = `**Retries \`fn\` with exponential backoff and jitter.**

- Waits 1s, 2s, 4s, 8s… capped at 15s, plus up to 250ms of random jitter so clients don't retry in lockstep.
- Rethrows the last error after \`attempts\` tries, so callers still see real failures.

**Worth checking:** it retries *every* error, including 4xx responses that will never succeed. Consider retrying only network errors, 429s and 5xx.`;

function minutesAgo(m: number) {
    return new Date(Date.now() - m * 60_000).toISOString();
}

export default function ProductPreview() {
    const initial = useMemo<Message[]>(() => [
        { id: 'p1', channelId: 'preview-general', user: maya, type: 'text', content: 'Can someone sanity-check this before I merge? Our client keeps hammering the API while it\'s down.', createdAt: minutesAgo(12) },
        { id: 'p2', channelId: 'preview-general', user: maya, type: 'code', language: 'typescript', content: RETRY_SNIPPET, aiExplanation: RETRY_EXPLANATION, createdAt: minutesAgo(12) },
        { id: 'p3', channelId: 'preview-general', user: leo, type: 'text', content: 'Good catch on the 4xx case. I\'ll add a `shouldRetry` predicate and ship it.', createdAt: minutesAgo(9) },
    ], []);
    const [messages, setMessages] = useState<Message[]>(initial);

    const send = (content: string, type: 'text' | 'code' = 'text', language = '') => {
        setMessages((prev) => [...prev, {
            id: `local-${prev.length}`,
            channelId: 'preview-general',
            user: you,
            type,
            language,
            content,
            createdAt: new Date().toISOString(),
        }]);
    };

    return (
        <div className="flex h-[600px] overflow-hidden rounded-2xl border border-line-strong bg-bg shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
            <div className="hidden lg:block">
                <Sidebar
                    workspace={{ id: 'preview', name: 'Acme Engineering', ownerId: maya.id }}
                    channels={channels}
                    activeChannel={channels[0]}
                    onSelectChannel={() => {}}
                    onCreateChannel={async () => { throw new Error('This is just a preview. Try the live demo!'); }}
                    onlineUsers={online}
                    currentUser={you}
                    onLogout={() => {}}
                    onOpenAISettings={() => {}}
                    hasOpenaiKey
                />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
                <ChatArea
                    messages={messages}
                    channel={channels[0]}
                    onlineUsers={online}
                    typingUsers={messages.length === initial.length ? [{ userId: maya.id, displayName: 'Maya Chen' }] : []}
                    preview
                />
                <MessageInput onSend={send} autoFocus={false} placeholder="Try typing here. It stays on this page." />
            </div>
        </div>
    );
}
