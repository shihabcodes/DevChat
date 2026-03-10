const express = require('express');
const OpenAI = require('openai');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/explain', auth, async (req, res) => {
    try {
        const { messageId, code, language } = req.body;

        if (messageId) {
            const message = await Message.findById(messageId);
            if (message?.aiExplanation) {
                return res.json({ explanation: message.aiExplanation, cached: true });
            }
        }

        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
            return res.status(503).json({
                error: 'AI explanation is not configured. Please set OPENAI_API_KEY in the server .env file.',
            });
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful code explanation assistant. Explain the following code snippet concisely but thoroughly. Use markdown formatting. Highlight key concepts, potential issues, and what the code does step by step.',
                },
                {
                    role: 'user',
                    content: `Explain this ${language || 'code'} snippet:\n\n\`\`\`${language || ''}\n${code}\n\`\`\``,
                },
            ],
            max_tokens: 1000,
            temperature: 0.3,
        });

        const explanation = completion.choices[0].message.content;

        if (messageId) {
            await Message.findByIdAndUpdate(messageId, { aiExplanation: explanation });
        }

        res.json({ explanation, cached: false });
    } catch (error) {
        console.error('AI explanation error:', error);
        res.status(500).json({ error: 'Failed to generate explanation' });
    }
});

module.exports = router;
