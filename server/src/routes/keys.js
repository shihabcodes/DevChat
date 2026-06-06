const express = require('express');
const OpenAI = require('openai');

const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { schemas, validate } = require('../middleware/validate');
const { encrypt, decrypt, maskKey } = require('../utils/crypto');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id)
            .select('+openaiKeyEnc +openaiKeyMask +openaiKeySetAt');
        res.json({
            hasKey: Boolean(user.openaiKeyEnc),
            mask: user.openaiKeyMask || null,
            setAt: user.openaiKeySetAt || null,
        });
    } catch (err) {
        next(err);
    }
});

router.post('/', validate(schemas.aiKey), async (req, res, next) => {
    try {
        const enc = encrypt(req.body.apiKey);
        const mask = maskKey(req.body.apiKey);
        await User.findByIdAndUpdate(req.user._id, {
            openaiKeyEnc: enc,
            openaiKeyMask: mask,
            openaiKeySetAt: new Date(),
        });
        res.status(201).json({ ok: true, mask });
    } catch (err) {
        next(err);
    }
});

router.delete('/', async (req, res, next) => {
    try {
        await User.findByIdAndUpdate(req.user._id, {
            $unset: { openaiKeyEnc: 1, openaiKeyMask: 1, openaiKeySetAt: 1 },
        });
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

// Tests the user's stored key against the OpenAI `/models` endpoint.
// Returns ok=false + a helpful reason on failure.
router.post('/test', async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select('+openaiKeyEnc');
        if (!user || !user.openaiKeyEnc) {
            return res.status(412).json({ ok: false, reason: 'no_key' });
        }
        let apiKey;
        try {
            apiKey = decrypt(user.openaiKeyEnc);
        } catch {
            return res.status(500).json({ ok: false, reason: 'decrypt_failed' });
        }
        const openai = new OpenAI({ apiKey });
        try {
            await openai.models.list();
            res.json({ ok: true, mask: user.openaiKeyMask });
        } catch (err) {
            const status = err.status || 500;
            if (status === 401) {
                return res.status(400).json({ ok: false, reason: 'invalid_key' });
            }
            if (status === 429) {
                return res.json({ ok: true, reason: 'rate_limited_but_key_works' });
            }
            res.status(502).json({ ok: false, reason: 'openai_error' });
        }
    } catch (err) {
        next(err);
    }
});

module.exports = router;
