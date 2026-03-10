const mongoose = require('mongoose');
const crypto = require('crypto');

const workspaceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    inviteCode: {
        type: String,
        unique: true,
    },
}, { timestamps: true });

workspaceSchema.pre('save', function (next) {
    if (!this.inviteCode) {
        this.inviteCode = crypto.randomBytes(6).toString('hex');
    }
    next();
});

module.exports = mongoose.model('Workspace', workspaceSchema);
