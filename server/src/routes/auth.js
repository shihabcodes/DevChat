const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const Channel = require('../models/Channel');
const auth = require('../middleware/auth');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


router.post('/register', async (req, res) => {
    try {
        const { email, password, displayName } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const user = new User({ email, password, displayName });
        await user.save();

        const workspace = new Workspace({
            name: `${displayName}'s Workspace`,
            owner: user._id,
            members: [user._id],
        });
        await workspace.save();

        const channel = new Channel({
            name: 'general',
            workspace: workspace._id,
            description: 'General discussion',
        });
        await channel.save();

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: '7d',
        });

        res.status(201).json({
            user: user.toJSON(),
            token,
            workspace: workspace.toObject(),
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: '7d',
        });

        const workspaces = await Workspace.find({ members: user._id });

        res.json({ user: user.toJSON(), token, workspaces });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/me', auth, async (req, res) => {
    try {
        const workspaces = await Workspace.find({ members: req.user._id });
        res.json({ user: req.user.toJSON(), workspaces });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/google', async (req, res) => {
    try {
        const { credential } = req.body;
        
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        
        const payload = ticket.getPayload();
        const { email, name, picture, sub: googleId } = payload;

        let user = await User.findOne({ email });

        if (!user) {
            user = new User({
                email,
                displayName: name,
                avatar: picture,
                googleId,
            });
            await user.save();

            const workspace = new Workspace({
                name: `${name}'s Workspace`,
                owner: user._id,
                members: [user._id],
            });
            await workspace.save();

            const channel = new Channel({
                name: 'general',
                workspace: workspace._id,
                description: 'General discussion',
            });
            await channel.save();
        } else if (!user.googleId) {
            // Link Google account to existing user
            user.googleId = googleId;
            if (!user.avatar) user.avatar = picture;
            await user.save();
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: '7d',
        });

        const workspaces = await Workspace.find({ members: user._id });

        res.json({ user: user.toJSON(), token, workspaces });
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
