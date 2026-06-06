const Workspace = require('../models/Workspace');
const Channel = require('../models/Channel');

// Verify the requester is a member of the workspace given by
// :workspaceId in the URL params, or attach it from req.workspace
// when called inline.

async function loadWorkspace(workspaceId) {
    return Workspace.findById(workspaceId);
}

function requireWorkspaceMember(getId) {
    return async (req, res, next) => {
        try {
            const workspaceId = getId(req);
            if (!workspaceId) {
                return res.status(400).json({ error: 'Missing workspace id' });
            }
            const workspace = await loadWorkspace(workspaceId);
            if (!workspace) {
                return res.status(404).json({ error: 'Workspace not found' });
            }
            const isMember = workspace.members.some(
                (m) => m.toString() === req.user._id.toString()
            );
            if (!isMember) {
                return res.status(403).json({ error: 'Not a member of this workspace' });
            }
            req.workspace = workspace;
            next();
        } catch (err) {
            next(err);
        }
    };
}

async function channelBelongsToWorkspace(channel, workspace) {
    if (!channel || !workspace) return false;
    return channel.workspace.toString() === workspace._id.toString();
}

function requireChannelMember(getId) {
    return async (req, res, next) => {
        try {
            const channelId = getId(req);
            if (!channelId) {
                return res.status(400).json({ error: 'Missing channel id' });
            }
            const channel = await Channel.findById(channelId);
            if (!channel) {
                return res.status(404).json({ error: 'Channel not found' });
            }
            const workspace = await loadWorkspace(channel.workspace);
            if (!workspace) {
                return res.status(404).json({ error: 'Workspace not found' });
            }
            const isMember = workspace.members.some(
                (m) => m.toString() === req.user._id.toString()
            );
            if (!isMember) {
                return res.status(403).json({ error: 'Not a member of this channel\'s workspace' });
            }
            req.channel = channel;
            req.workspace = workspace;
            next();
        } catch (err) {
            next(err);
        }
    };
}

module.exports = { requireWorkspaceMember, requireChannelMember, channelBelongsToWorkspace };
