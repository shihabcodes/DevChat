const express = require('express');
const Channel = require('../models/Channel');
const Workspace = require('../models/Workspace');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/workspace/:workspaceId', auth, async (req, res) => {
    try {
        const channels = await Channel.find({ workspace: req.params.workspaceId })
            .sort({ createdAt: 1 });
        res.json(channels);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', auth, async (req, res) => {
    try {
        const { name, workspaceId, description } = req.body;

        const workspace = await Workspace.findById(workspaceId);
        if (!workspace || !workspace.members.includes(req.user._id)) {
            return res.status(403).json({ error: 'Not a member of this workspace' });
        }

        const channel = new Channel({
            name: name.toLowerCase().replace(/\s+/g, '-'),
            workspace: workspaceId,
            description: description || '',
        });
        await channel.save();

        res.status(201).json(channel);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Channel name already exists in this workspace' });
        }
        res.status(500).json({ error: error.message });
    }
});

router.patch('/:id', auth, async (req, res) => {
    try {
        const { name } = req.body;
        const channel = await Channel.findByIdAndUpdate(
            req.params.id,
            { name: name.toLowerCase().replace(/\s+/g, '-') },
            { new: true }
        );
        if (!channel) {
            return res.status(404).json({ error: 'Channel not found' });
        }
        res.json(channel);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', auth, async (req, res) => {
    try {
        const channel = await Channel.findByIdAndDelete(req.params.id);
        if (!channel) {
            return res.status(404).json({ error: 'Channel not found' });
        }
        res.json({ message: 'Channel deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
