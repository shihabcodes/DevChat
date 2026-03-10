const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['text', 'code'],
        default: 'text',
    },
    language: {
        type: String,
        default: '',
    },
    channel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel',
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    aiExplanation: {
        type: String,
        default: null,
    },
}, { timestamps: true });

messageSchema.index({ channel: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
