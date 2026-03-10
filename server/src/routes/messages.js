const express = require('express');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/channel/:channelId', auth, async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const messages = await Message.find({ channel: req.params.channelId })
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('user', 'displayName email avatar');

        const total = await Message.countDocuments({ channel: req.params.channelId });

        res.json({
            messages,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
