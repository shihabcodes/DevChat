// Environment configuration with hard-fail on insecure defaults.

const DEFAULT_CLIENT_URL = 'http://localhost:3000';
const DEFAULT_ALLOWED_ORIGINS = [DEFAULT_CLIENT_URL, 'http://localhost:3000'];

function parseAllowedOrigins() {
    const raw = process.env.ALLOWED_ORIGINS;
    if (!raw) return DEFAULT_ALLOWED_ORIGINS;
    return raw
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
}

function cleanEnvStr(val) {
    if (!val) return val;
    return val.trim().replace(/^['"]|['"]$/g, '');
}

function assertSecret(name, value, minLength, isProd) {
    if (!value) {
        throw new Error(`Missing required env var: ${name}`);
    }
    if (value.length < minLength) {
        throw new Error(`${name} must be at least ${minLength} characters`);
    }
    if (isProd) {
        const unsafe = ['change', 'your_', 'changeme', 'placeholder', 'example'];
        const lower = value.toLowerCase();
        if (unsafe.some((s) => lower.includes(s))) {
            throw new Error(`${name} looks like a placeholder. Refusing to boot in production.`);
        }
    }
}

function getEnv() {
    const isProd = cleanEnvStr(process.env.NODE_ENV) === 'production';
    const env = {
        NODE_ENV: cleanEnvStr(process.env.NODE_ENV) || 'development',
        PORT: parseInt(process.env.PORT, 10) || 5001,
        IS_PROD: isProd,
        MONGODB_URI: cleanEnvStr(process.env.MONGODB_URI) || 'mongodb://127.0.0.1:27017/devchat',
        JWT_SECRET: cleanEnvStr(process.env.JWT_SECRET) || 'devchat_dev_secret_change_in_production_minimum_64_chars_required',
        CLIENT_URL: cleanEnvStr(process.env.CLIENT_URL) || DEFAULT_CLIENT_URL,
        ALLOWED_ORIGINS: parseAllowedOrigins(),
        OPENAI_KEY_ENCRYPTION_SECRET:
            cleanEnvStr(process.env.OPENAI_KEY_ENCRYPTION_SECRET) || 'devchat_dev_openai_key_encryption_secret_32bytes_min_xx',
        GOOGLE_CLIENT_ID: cleanEnvStr(process.env.GOOGLE_CLIENT_ID) || '',
        DEMO_TTL_HOURS: parseInt(process.env.DEMO_TTL_HOURS, 10) || 2,
    };

    if (isProd) {
        assertSecret('JWT_SECRET', env.JWT_SECRET, 32, true);
        assertSecret('OPENAI_KEY_ENCRYPTION_SECRET', env.OPENAI_KEY_ENCRYPTION_SECRET, 32, true);
    }

    return env;
}

module.exports = getEnv();
