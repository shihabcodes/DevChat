const express = require('express');
const Message = require('../models/Message');
const { authenticate } = require('../middleware/auth');
const { requireChannelMember } = require('../middleware/authorize');

const router = express.Router();
router.use(authenticate);

router.get('/channel/:channelId',
    requireChannelMember((req) => req.params.channelId),
    async (req, res, next) => {
        try {
            const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
            const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
            const skip = (page - 1) * limit;
            const [messages, total] = await Promise.all([
                Message.find({ channel: req.channel._id })
                    .sort({ createdAt: 1 })
                    .skip(skip)
                    .limit(limit)
                    .populate('user', 'displayName email avatar'),
                Message.countDocuments({ channel: req.channel._id }),
            ]);
            res.json({
                messages,
                total,
                page,
                totalPages: Math.ceil(total / limit),
            });
        } catch (err) {
            next(err);
        }
    }
);

module.exports = router;
