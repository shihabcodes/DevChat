const express = require('express');
const { OAuth2Client } = require('google-auth-library');

const env = require('../config/env');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const Channel = require('../models/Channel');
const Message = require('../models/Message');
const { authenticate, signToken } = require('../middleware/auth');
const { schemas, validate } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();
const googleClient = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

const DISPOSABLE_DOMAINS = new Set([
    'mailinator.com', '10minutemail.com', 'tempmail.com', 'guerrillamail.com',
    'throwaway.email', 'yopmail.com', 'trashmail.com', 'fakeinbox.com',
    'maildrop.cc', 'getnada.com', 'dispostable.com',
]);

function isDisposable(email) {
    const domain = email.split('@')[1];
    return domain && DISPOSABLE_DOMAINS.has(domain.toLowerCase());
}

const WELCOME_TEXT = `👋 Welcome to DevChat!

This is **#general** in your new workspace. Here's what you can do:

- **Send code** — click the \`</>\` button to switch to code mode with the Monaco editor
- **✨ Explain** — click the button on any code block to get an AI explanation streamed in
- **Invite teammates** — click 🔗 in the sidebar to copy an invite code
- **Add your OpenAI key** — click ⚡ in the sidebar to enable AI features (uses your own key, encrypted at rest)

Have fun!`;

const WELCOME_CODE = `// Paste your code here, or write something interesting to share.
function greet(name) {
  return \`Hello, \${name}! Welcome to DevChat.\`;
}

console.log(greet('developer'));`;

const WELCOME_TIP = `💡 **Try it now:** switch to code mode with the \`</>\` button, paste the snippet above, and click ✨ Explain to see the AI response stream in.`;

// The "DevChat Bot" user. Lazily created on first real signup and
// reused for every welcome message after that. We use a 64-byte
// random password that no human will ever type — the bot has no
// login surface. The password is required by the schema.
async function getOrCreateBot() {
    const email = 'bot@devchat.local';
    let bot = await User.findOne({ email });
    if (!bot) {
        const crypto = require('crypto');
        bot = await User.create({
            email,
            displayName: 'DevChat Bot',
            role: 'admin',
            // 96 random bytes; this user can never log in via password
            // because there's no UI surface for it.
            password: crypto.randomBytes(96).toString('hex'),
        });
    }
    return bot;
}

async function seedWelcome(channel, user) {
    const bot = await getOrCreateBot();
    const now = Date.now();
    await Message.create({
        content: WELCOME_TEXT,
        type: 'text',
        channel: channel._id,
        user: bot._id,
        createdAt: new Date(now - 60000),
    });
    await Message.create({
        content: WELCOME_CODE,
        type: 'code',
        language: 'javascript',
        channel: channel._id,
        user: bot._id,
        createdAt: new Date(now - 30000),
    });
    await Message.create({
        content: WELCOME_TIP,
        type: 'text',
        channel: channel._id,
        user: bot._id,
        createdAt: new Date(now),
    });
}

async function createOnboardingAssets(user) {
    const workspace = await Workspace.create({
        name: `${user.displayName}'s Workspace`,
        owner: user._id,
        members: [user._id],
    });
    const channel = await Channel.create({
        name: 'general',
        workspace: workspace._id,
        description: 'General discussion',
    });
    await seedWelcome(channel, user);
    return workspace;
}

router.post('/register', authLimiter, validate(schemas.register), async (req, res, next) => {
    try {
        const { email, password, displayName } = req.body;
        if (isDisposable(email)) {
            return res.status(400).json({ error: 'Disposable email addresses are not allowed' });
        }
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(409).json({ error: 'Email already registered' });
        }
        const user = await User.create({ email, password, displayName, role: 'developer' });
        const workspace = await createOnboardingAssets(user);
        const token = signToken(user);
        res.status(201).json({ user: user.toJSON(), token, workspace });
    } catch (err) {
        next(err);
    }
});

router.post('/login', authLimiter, validate(schemas.login), async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        if (user.expiresAt && user.expiresAt.getTime() < Date.now()) {
            return res.status(401).json({ error: 'Session expired' });
        }
        const token = signToken(user);
        const workspaces = await Workspace.find({ members: user._id });
        res.json({ user: user.toJSON(), token, workspaces });
    } catch (err) {
        next(err);
    }
});

router.get('/me', authenticate, async (req, res, next) => {
    try {
        const workspaces = await Workspace.find({ members: req.user._id });
        res.json({
            user: req.user.toJSON(),
            workspaces,
            hasOpenaiKey: Boolean(req.user.openaiKeyEnc),
        });
    } catch (err) {
        next(err);
    }
});

// Google OAuth. Closes the original account-takeover flow: if an
// existing user has a password set, we DO NOT silently link the
// Google ID. The user must explicitly merge via /api/auth/google/merge.
router.post('/google', authLimiter, validate(schemas.google), async (req, res, next) => {
    try {
        if (!googleClient) {
            return res.status(503).json({ error: 'Google sign-in is not configured on this server.' });
        }
        const ticket = await googleClient.verifyIdToken({
            idToken: req.body.credential,
            audience: env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload.email_verified) {
            return res.status(401).json({ error: 'Google account email is not verified.' });
        }
        const { email, name, picture, sub: googleId } = payload;
        const normalized = email.toLowerCase().trim();

        let user = await User.findOne({ googleId });

        if (!user) {
            user = await User.findOne({ email: normalized });
            if (user) {
                // Account already exists by email. Refuse to silently link
                // — that would let an attacker squat an email and then
                // pull the real owner into the attacker's account.
                if (user.password) {
                    return res.status(409).json({
                        error: 'An account with this email already exists. Sign in with email + password, then link Google from Settings.',
                        code: 'EXISTING_PASSWORD_ACCOUNT',
                    });
                }
                user.googleId = googleId;
                if (!user.avatar) user.avatar = picture;
                await user.save();
            } else {
                user = await User.create({
                    email: normalized,
                    displayName: name || normalized.split('@')[0],
                    avatar: picture,
                    googleId,
                    role: 'developer',
                });
                await createOnboardingAssets(user);
            }
        }

        const token = signToken(user);
        const workspaces = await Workspace.find({ members: user._id });
        res.json({ user: user.toJSON(), token, workspaces });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
