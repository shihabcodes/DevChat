const express = require('express');
const Workspace = require('../models/Workspace');
const Channel = require('../models/Channel');
const Message = require('../models/Message');
const User = require('../models/User');
const { authenticate, signToken } = require('../middleware/auth');
const { requireWorkspaceMember } = require('../middleware/authorize');
const { schemas, validate } = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

async function getOrCreateBot() {
    const email = 'bot@devchat.local';
    let bot = await User.findOne({ email });
    if (!bot) {
        const crypto = require('crypto');
        bot = await User.create({
            email,
            displayName: 'DevChat Bot',
            role: 'admin',
            password: crypto.randomBytes(96).toString('hex'),
        });
    }
    return bot;
}

const WELCOME_TIP = `💡 **Tip:** click the \`</>\` button to switch to code mode, then click ✨ Explain on any code block. To enable AI, add your OpenAI key via the ⚡ button in the sidebar.`;

async function seedWelcome(channel) {
    const bot = await getOrCreateBot();
    await Message.create({
        content: WELCOME_TIP,
        type: 'text',
        channel: channel._id,
        user: bot._id,
    });
}

router.get('/', async (req, res, next) => {
    try {
        const workspaces = await Workspace.find({ members: req.user._id })
            .populate('members', 'displayName email avatar status')
            .populate('owner', 'displayName email');
        res.json(workspaces);
    } catch (err) {
        next(err);
    }
});

router.post('/', validate(schemas.createWorkspace), async (req, res, next) => {
    try {
        const workspace = await Workspace.create({
            name: req.body.name,
            owner: req.user._id,
            members: [req.user._id],
        });
        const channel = await Channel.create({
            name: 'general',
            workspace: workspace._id,
            description: 'General discussion',
        });
        await seedWelcome(channel);
        res.status(201).json(workspace);
    } catch (err) {
        next(err);
    }
});

router.get('/:id',
    requireWorkspaceMember((req) => req.params.id),
    async (req, res) => {
        const populated = await Workspace.findById(req.workspace._id)
            .populate('members', 'displayName email avatar status');
        res.json(populated);
    }
);

router.post('/join', validate(schemas.joinWorkspace), async (req, res, next) => {
    try {
        const workspace = await Workspace.findOne({ inviteCode: req.body.inviteCode });
        if (!workspace) return res.status(404).json({ error: 'Invalid invite code' });
        if (workspace.members.some((m) => m.toString() === req.user._id.toString())) {
            return res.status(409).json({ error: 'Already a member' });
        }
        workspace.members.push(req.user._id);
        await workspace.save();
        const populated = await Workspace.findById(workspace._id)
            .populate('members', 'displayName email avatar status');
        res.json(populated);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
