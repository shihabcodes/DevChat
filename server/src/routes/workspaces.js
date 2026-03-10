const express = require('express');
const Workspace = require('../models/Workspace');
const Channel = require('../models/Channel');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
    try {
        const workspaces = await Workspace.find({ members: req.user._id })
            .populate('members', 'displayName email avatar status')
            .populate('owner', 'displayName email');
        res.json(workspaces);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', auth, async (req, res) => {
    try {
        const { name } = req.body;

        const workspace = new Workspace({
            name,
            owner: req.user._id,
            members: [req.user._id],
        });
        await workspace.save();

        const channel = new Channel({
            name: 'general',
            workspace: workspace._id,
            description: 'General discussion',
        });
        await channel.save();

        res.status(201).json(workspace);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id', auth, async (req, res) => {
    try {
        const workspace = await Workspace.findById(req.params.id)
            .populate('members', 'displayName email avatar status');

        if (!workspace) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        if (!workspace.members.some(m => m._id.toString() === req.user._id.toString())) {
            return res.status(403).json({ error: 'Not a member of this workspace' });
        }

        res.json(workspace);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/join', auth, async (req, res) => {
    try {
        const { inviteCode } = req.body;

        const workspace = await Workspace.findOne({ inviteCode });
        if (!workspace) {
            return res.status(404).json({ error: 'Invalid invite code' });
        }

        if (workspace.members.includes(req.user._id)) {
            return res.status(400).json({ error: 'Already a member' });
        }

        workspace.members.push(req.user._id);
        await workspace.save();

        const populated = await Workspace.findById(workspace._id)
            .populate('members', 'displayName email avatar status');

        res.json(populated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
