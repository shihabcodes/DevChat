const crypto = require('crypto');
const env = require('../config/env');

// AES-256-GCM authenticated encryption. Used to encrypt user-supplied
// OpenAI API keys at rest. The encrypted blob format is:
//   base64(iv | authTag | ciphertext)
//
// 12-byte IV (GCM default), 32-byte key (derived via SHA-256 from the
// configured secret), 16-byte auth tag.

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const KEY = crypto.createHash('sha256').update(env.OPENAI_KEY_ENCRYPTION_SECRET).digest();

function encrypt(plaintext) {
    if (!plaintext) return null;
    const iv = crypto.randomBytes(IV_LEN);
    const cipher = crypto.createCipheriv(ALGO, KEY, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

function decrypt(payload) {
    if (!payload) return null;
    const buf = Buffer.from(payload, 'base64');
    if (buf.length < IV_LEN + 16) {
        throw new Error('Encrypted payload is too short');
    }
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + 16);
    const ciphertext = buf.subarray(IV_LEN + 16);
    const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString('utf8');
}

function maskKey(apiKey) {
    if (!apiKey) return '';
    if (apiKey.length <= 8) return '••••';
    return apiKey.slice(0, 7) + '…' + apiKey.slice(-4);
}

module.exports = { encrypt, decrypt, maskKey };
