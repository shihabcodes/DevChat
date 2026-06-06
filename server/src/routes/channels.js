const express = require('express');
const Channel = require('../models/Channel');
const Workspace = require('../models/Workspace');
const { authenticate } = require('../middleware/auth');
const { requireWorkspaceMember, requireChannelMember } = require('../middleware/authorize');
const { schemas, validate } = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

router.get('/workspace/:workspaceId',
    requireWorkspaceMember((req) => req.params.workspaceId),
    async (req, res) => {
        const channels = await Channel.find({ workspace: req.workspace._id }).sort({ createdAt: 1 });
        res.json(channels);
    }
);

router.post('/',
    validate(schemas.createChannel),
    requireWorkspaceMember((req) => req.body.workspaceId),
    async (req, res, next) => {
        try {
            const channel = await Channel.create({
                name: req.body.name.toLowerCase().replace(/\s+/g, '-'),
                workspace: req.workspace._id,
                description: req.body.description,
            });
            res.status(201).json(channel);
        } catch (err) {
            if (err.code === 11000) {
                return res.status(409).json({ error: 'Channel name already exists in this workspace' });
            }
            next(err);
        }
    }
);

router.patch('/:id',
    validate(schemas.updateChannel),
    requireChannelMember((req) => req.params.id),
    async (req, res, next) => {
        try {
            const channel = await Channel.findByIdAndUpdate(
                req.channel._id,
                { name: req.body.name.toLowerCase().replace(/\s+/g, '-') },
                { new: true }
            );
            res.json(channel);
        } catch (err) {
            next(err);
        }
    }
);

router.delete('/:id',
    requireChannelMember((req) => req.params.id),
    async (req, res, next) => {
        try {
            // Only the workspace owner or a channel admin can delete.
            const isOwner = req.workspace.owner.toString() === req.user._id.toString();
            if (!isOwner && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Only the workspace owner can delete channels' });
            }
            await Channel.findByIdAndDelete(req.channel._id);
            res.json({ message: 'Channel deleted' });
        } catch (err) {
            next(err);
        }
    }
);

module.exports = router;
