const express = require('express');
const crypto = require('crypto');

const env = require('../config/env');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const Channel = require('../models/Channel');
const Message = require('../models/Message');
const { signToken } = require('../middleware/auth');

const router = express.Router();

const SAMPLE_CODE = `function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

const onResize = debounce(() => {
  console.log('resized', window.innerWidth);
}, 150);

window.addEventListener('resize', onResize);`;

const SAMPLE_AI_EXPLANATION = `This is the classic **debounce** pattern. It ensures that \`fn\` only runs after the user has stopped calling it for \`wait\` milliseconds.

**Step by step**
- \`let t\` keeps the timer id between calls.
- On each call we cancel the previous timer and start a new one.
- Only the *last* call in a burst actually fires \`fn\`, after \`wait\` ms of quiet.

**Why it matters**
- \`resize\`, \`scroll\`, and \`input\` events fire dozens of times per second. Debouncing collapses those bursts into a single call.
- It's *different* from throttling, which fires at a fixed rate no matter what.

**Watch out for**
- The trailing-edge behavior means the first call is delayed — if you need the leading edge, you have to write it yourself.
- Forgetting \`clearTimeout\` causes stale timers to fire after the component unmounts (in React, this leaks).`;

const SAMPLE_CODE_2 = `import { useEffect, useState } from 'react';

export function useDebouncedValue(value, delay = 200) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}`;

const SAMPLE_AI_EXPLANATION_2 = `A small **React hook** that returns a value that only updates \`delay\` ms after the most recent change.

**The interesting part is the cleanup**
- \`useEffect\` returns \`() => clearTimeout(t)\`. React calls this cleanup before the effect runs again (on \`value\` change) *and* on unmount.
- That's why the timer is always cancelled — no leaked timeouts.

**Use it for**
- Live-search inputs (don't query on every keystroke).
- Chart resizes (don't redraw on every animation frame).
- Anything where "wait until they stop" is the right behavior.

**Subtleties**
- If \`value\` changes twice in 100ms and \`delay\` is 200ms, the consumer sees *neither* of those intermediate values, only the final one. Sometimes that's what you want, sometimes it isn't.`;

async function seedChannel(channelId) {
    const now = new Date();
    const t = (offsetMin) => new Date(now.getTime() - offsetMin * 60 * 1000);
    const guestUserId = (await User.findOne({ role: 'guest' }).sort({ createdAt: -1 }))?._id;

    const welcome = await Message.create({
        content: '👋 Welcome to DevChat. Try pasting a code snippet in code mode and clicking **✨ Explain** to see the AI stream in.',
        type: 'text',
        channel: channelId,
        user: guestUserId,
        createdAt: t(8),
    });

    const codeMsg = await Message.create({
        content: SAMPLE_CODE,
        type: 'code',
        language: 'javascript',
        channel: channelId,
        user: guestUserId,
        aiExplanation: SAMPLE_AI_EXPLANATION,
        createdAt: t(7),
    });

    const codeMsg2 = await Message.create({
        content: SAMPLE_CODE_2,
        type: 'code',
        language: 'javascript',
        channel: channelId,
        user: guestUserId,
        aiExplanation: SAMPLE_AI_EXPLANATION_2,
        createdAt: t(5),
    });

    const tip = await Message.create({
        content: '💡 **Tip:** Click ✨ Explain on either snippet above to see the streamed response (already cached here so you don\'t need an OpenAI key).',
        type: 'text',
        channel: channelId,
        user: guestUserId,
        createdAt: t(4),
    });

    const others = await Promise.all([
        Message.create({
            content: 'just shipped the v1 to staging 🚀',
            type: 'text',
            channel: channelId,
            user: guestUserId,
            createdAt: t(20),
        }),
        Message.create({
            content: 'sweet, want me to take a look at the migration script?',
            type: 'text',
            channel: channelId,
            user: guestUserId,
            createdAt: t(18),
        }),
        Message.create({
            content: 'yeah that would help — the FK ordering is the tricky part',
            type: 'text',
            channel: channelId,
            user: guestUserId,
            createdAt: t(17),
        }),
    ]);

    return [welcome, codeMsg, codeMsg2, tip, ...others];
}

// Periodically prune guest users and their workspaces. Best-effort.
let cleanupInterval = null;
function startDemoCleanup() {
    if (cleanupInterval) return;
    cleanupInterval = setInterval(async () => {
        try {
            const cutoff = new Date(Date.now() - env.DEMO_TTL_HOURS * 60 * 60 * 1000);
            const guests = await User.find({ role: 'guest', createdAt: { $lt: cutoff } }).select('_id');
            if (!guests.length) return;
            const ids = guests.map((g) => g._id);
            await Message.deleteMany({ user: { $in: ids } });
            await Channel.deleteMany({ workspace: { $in: await Workspace.find({ owner: { $in: ids } }).distinct('_id') } });
            await Workspace.deleteMany({ owner: { $in: ids } });
            await User.deleteMany({ _id: { $in: ids } });
        } catch (err) {
            // cleanup is best-effort
            require('./config/logger').warn('demo cleanup failed', { message: err.message });
        }
    }, 15 * 60 * 1000);
    if (cleanupInterval.unref) cleanupInterval.unref();
}

router.post('/', async (req, res, next) => {
    try {
        startDemoCleanup();
        const stamp = Date.now().toString(36);
        const random = crypto.randomBytes(3).toString('hex');
        const email = `demo-${stamp}-${random}@guest.devchat.local`;
        const displayName = `Guest-${random.toUpperCase()}`;

        const user = await User.create({
            email,
            displayName,
            role: 'guest',
            status: 'online',
            password: crypto.randomBytes(96).toString('hex'),
        });

        const workspace = await Workspace.create({
            name: 'Demo Workspace',
            owner: user._id,
            members: [user._id],
        });
        const channel = await Channel.create({
            name: 'general',
            workspace: workspace._id,
            description: 'Try the ✨ Explain button on the code snippets below.',
        });

        await seedChannel(channel._id);

        const token = signToken(user);
        res.status(201).json({
            token,
            user: user.toJSON(),
            workspace,
            channel,
            ttlHours: env.DEMO_TTL_HOURS,
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
