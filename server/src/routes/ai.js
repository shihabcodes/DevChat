const express = require('express');
const OpenAI = require('openai');
const { getHighlighter } = require('shiki');

const Message = require('../models/Message');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { schemas, validate } = require('../middleware/validate');
const { aiLimiter } = require('../middleware/rateLimit');
const { decrypt } = require('../utils/crypto');

const router = express.Router();

let highlighterPromise = null;
function getShiki() {
    if (!highlighterPromise) {
        highlighterPromise = getHighlighter({
            themes: ['github-dark'],
            langs: [
                'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
                'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'html', 'css',
                'sql', 'bash', 'json', 'yaml', 'markdown',
            ],
        });
    }
    return highlighterPromise;
}

const SHIKI_LANGS = new Set([
    'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
    'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'html', 'css',
    'sql', 'bash', 'json', 'yaml', 'markdown',
]);

async function renderHighlightedCode(code, language) {
    const lang = SHIKI_LANGS.has(language) ? language : 'text';
    try {
        const hl = await getShiki();
        return hl.codeToHtml(code, { lang, theme: 'github-dark' });
    } catch {
        // Fallback: escaped <pre><code> with line numbers. Never
        // throw on rendering — we always want to return *something*.
        const escaped = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        return `<pre class="shiki-fallback"><code>${escaped}</code></pre>`;
    }
}

function sendSse(res, event, data) {
    if (event) res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
}

router.post('/explain',
    authenticate,
    aiLimiter,
    validate(schemas.explain),
    async (req, res, next) => {
        try {
            const { messageId, code, language } = req.body;

            // 1. Cache hit short-circuit.
            if (messageId) {
                const existing = await Message.findById(messageId);
                if (existing && existing.aiExplanation) {
                    const html = await renderHighlightedCode(code, language);
                    return res.json({
                        explanation: existing.aiExplanation,
                        highlightedHtml: html,
                        cached: true,
                    });
                }
            }

            // 2. The user must have a key on file.
            const user = await User.findById(req.user._id).select('+openaiKeyEnc');
            if (!user || !user.openaiKeyEnc) {
                return res.status(412).json({
                    error: 'No OpenAI key on file. Add one in AI Settings to use explanations.',
                    code: 'NO_OPENAI_KEY',
                });
            }

            let apiKey;
            try {
                apiKey = decrypt(user.openaiKeyEnc);
            } catch {
                return res.status(500).json({ error: 'Stored key could not be decrypted. Re-add it in AI Settings.' });
            }

            // 3. Server-Sent Events stream.
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache, no-transform');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-Accel-Buffering', 'no');
            res.flushHeaders?.();

            const openai = new OpenAI({ apiKey });
            const systemPrompt = 'You are a helpful code explanation assistant. Explain the following code snippet concisely but thoroughly. Use markdown formatting. Highlight key concepts, potential issues, and what the code does step by step.';
            const userPrompt = `Explain this ${language || 'code'} snippet:\n\n\`\`\`${language || ''}\n${code}\n\`\`\``;

            let full = '';
            try {
                const stream = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    stream: true,
                    temperature: 0.3,
                    max_tokens: 800,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                });

                for await (const chunk of stream) {
                    const delta = chunk.choices?.[0]?.delta?.content;
                    if (delta) {
                        full += delta;
                        sendSse(res, 'delta', { text: delta });
                    }
                }

                // Persist the final explanation if we have a messageId.
                if (messageId && full) {
                    await Message.findByIdAndUpdate(messageId, { aiExplanation: full });
                }
                sendSse(res, 'done', { cached: false, explanation: full });
                res.end();
            } catch (apiErr) {
                const status = apiErr.status || 500;
                const safeMessage = status === 401
                    ? 'Your OpenAI key was rejected. Check that it is valid and has credits.'
                    : status === 429
                        ? 'OpenAI rate-limited the request. Please try again in a moment.'
                        : 'AI service error. Please try again.';
                if (!res.headersSent) {
                    res.status(status === 401 || status === 429 ? 400 : 502);
                }
                sendSse(res, 'error', { error: safeMessage, status });
                res.end();
            }
        } catch (err) {
            next(err);
        }
    }
);

module.exports = router;
