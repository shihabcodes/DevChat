// End-to-end smoke test for DevChat.
// Run after `node src/index.js` is up on :5001.

const http = require('http');

const HOST = 'localhost';
const PORT = 5001;
let pass = 0, fail = 0;

function req(method, path, body, token) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : '';
        const opts = {
            hostname: HOST, port: PORT, path, method,
            headers: {
                ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
                ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
            },
        };
        const r = http.request(opts, (res) => {
            let buf = '';
            res.on('data', (c) => (buf += c));
            res.on('end', () => {
                let j = null;
                try { j = JSON.parse(buf); } catch { j = buf; }
                resolve({ status: res.statusCode, body: j });
            });
        });
        r.on('error', reject);
        if (data) r.write(data);
        r.end();
    });
}

function check(name, ok, detail) {
    if (ok) {
        console.log(`  ✓ ${name}`);
        pass++;
    } else {
        console.log(`  ✗ ${name}${detail ? ': ' + detail : ''}`);
        fail++;
    }
}

function ts() { return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19); }

async function main() {
    console.log('--- DevChat smoke test ---');

    // 1. Health
    let r = await req('GET', '/api/health');
    check('health 200', r.status === 200);
    check('health mongo:1', r.body.mongo === 1);

    // 2. Validation rejects bad input
    r = await req('POST', '/api/auth/register', { email: 'not-an-email', password: 'short', displayName: '' });
    check('validation 400 on bad input', r.status === 400 && r.body.details);

    // 3. Disposable email blocked
    r = await req('POST', '/api/auth/register', { email: 'foo@guerrillamail.com', password: 'validpass123', displayName: 'X' });
    check('disposable email blocked', r.status === 400 && /Disposable/.test(r.body.error));

    // 4. Register alice
    const alice = await req('POST', '/api/auth/register', {
        email: `alice-${ts()}@example.com`, password: 'alicepass123', displayName: 'Alice',
    });
    check('register alice 201', alice.status === 201 && alice.body.token);
    const aliceToken = alice.body.token;
    const aliceWs = alice.body.workspace._id;

    // 5. Get alice's channel
    r = await req('GET', `/api/channels/workspace/${aliceWs}`, null, aliceToken);
    check('list alice channels', r.status === 200 && r.body.length > 0);
    const aliceCh = r.body[0]._id;

    // 6. Welcome bot seeded
    r = await req('GET', `/api/messages/channel/${aliceCh}`, null, aliceToken);
    check('welcome bot seeded 3 messages', r.status === 200 && r.body.messages.length === 3);

    // 7. Demo flow returns messages
    const demo = await req('POST', '/api/demo');
    check('demo 201', demo.status === 201);
    check('demo returns 7 messages', demo.body.messages && demo.body.messages.length === 7);
    const codeMsg = demo.body.messages.find(m => m.type === 'code');
    check('demo code messages have cached AI', codeMsg && codeMsg.aiExplanation);

    // 8. AI explain cache hit on demo
    r = await req('POST', '/api/ai/explain', { messageId: codeMsg._id }, demo.body.token);
    check('AI explain cached:true', r.status === 200 && r.body.cached === true);
    check('AI explain has highlightedHtml', r.body.highlightedHtml && r.body.highlightedHtml.length > 100);

    // 9. AI explain without key returns 412
    r = await req('POST', '/api/ai/explain', { code: 'console.log(1)', language: 'javascript' }, demo.body.token);
    check('AI explain 412 NO_OPENAI_KEY', r.status === 412 && r.body.code === 'NO_OPENAI_KEY');

    // 10. IDOR: alice can't read demo channel
    r = await req('GET', `/api/messages/channel/${demo.body.channel._id}`, null, aliceToken);
    check('IDOR: alice→demo channel = 403', r.status === 403);

    // 11. IDOR: bob can't read alice's channel
    const bob = await req('POST', '/api/auth/register', {
        email: `bob-${ts()}@example.com`, password: 'bobpass123', displayName: 'Bob',
    });
    check('register bob 201', bob.status === 201);
    r = await req('GET', `/api/messages/channel/${aliceCh}`, null, bob.body.token);
    check('IDOR: bob→alice channel = 403', r.status === 403);

    // 12. OpenAI key save/get/delete
    r = await req('POST', '/api/keys', { apiKey: 'sk-test1234567890abcdef1234567890abcdef1234567890abcdef' }, demo.body.token);
    check('save OpenAI key', r.status === 201);
    r = await req('GET', '/api/keys', null, demo.body.token);
    check('get OpenAI key mask', r.status === 200 && r.body.hasKey && r.body.mask);
    r = await req('DELETE', '/api/keys', null, demo.body.token);
    check('delete OpenAI key', r.status === 200);

    // 13. AI explain schema requires messageId OR code
    r = await req('POST', '/api/ai/explain', {}, aliceToken);
    check('AI schema: empty body = 400', r.status === 400);

    // 14. Demo user is a guest role
    check('demo user is guest', demo.body.user.role === 'guest');

    // 15. Auth me returns hasOpenaiKey boolean
    r = await req('GET', '/api/auth/me', null, aliceToken);
    check('/auth/me has hasOpenaiKey bool', r.status === 200 && typeof r.body.hasOpenaiKey === 'boolean');

    console.log(`\n${pass} passed, ${fail} failed`);
    process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
