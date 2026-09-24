import 'server-only';
import crypto from 'node:crypto';

// AES-256-GCM for users' OpenAI keys at rest.
// Stored format: base64(iv[12] | authTag[16] | ciphertext).

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function key(): Buffer {
    const secret = process.env.AI_KEY_ENCRYPTION_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error('AI_KEY_ENCRYPTION_SECRET must be set to at least 32 characters');
    }
    return crypto.createHash('sha256').update(secret).digest();
}

export function encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LEN);
    const cipher = crypto.createCipheriv(ALGO, key(), iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64');
}

export function decrypt(payload: string): string {
    const buf = Buffer.from(payload, 'base64');
    if (buf.length < IV_LEN + TAG_LEN) throw new Error('Encrypted payload is too short');
    const decipher = crypto.createDecipheriv(ALGO, key(), buf.subarray(0, IV_LEN));
    decipher.setAuthTag(buf.subarray(IV_LEN, IV_LEN + TAG_LEN));
    return Buffer.concat([decipher.update(buf.subarray(IV_LEN + TAG_LEN)), decipher.final()]).toString('utf8');
}

export function maskKey(apiKey: string): string {
    return apiKey.length <= 12 ? '••••' : `${apiKey.slice(0, 7)}…${apiKey.slice(-4)}`;
}
