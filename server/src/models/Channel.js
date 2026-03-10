const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    workspace: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workspace',
        required: true,
    },
    description: {
        type: String,
        default: '',
    },
}, { timestamps: true });

channelSchema.index({ name: 1, workspace: 1 }, { unique: true });

module.exports = mongoose.model('Channel', channelSchema);
