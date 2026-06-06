// Client-side Shiki loader. The full Shiki bundle is large (~1MB+ for
// all languages), so we lazy-load it on the first CodeBlock render.
// Languages are restricted to the same set the server supports so the
// server-side and client-side renderings stay in sync.

import { getHighlighter } from 'shiki';

const LANGS = [
    'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
    'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'html', 'css',
    'sql', 'bash', 'json', 'yaml', 'markdown',
];

let highlighterPromise = null;
export function getClientHighlighter() {
    if (typeof window === 'undefined') return null;
    if (!highlighterPromise) {
        highlighterPromise = getHighlighter({
            themes: ['github-dark'],
            langs: LANGS,
        });
    }
    return highlighterPromise;
}

export async function highlightCode(code, language) {
    try {
        const hl = await getClientHighlighter();
        if (!hl) return null;
        const lang = LANGS.includes(language) ? language : 'text';
        return hl.codeToHtml(code, { lang, theme: 'github-dark' });
    } catch (err) {
        console.warn('Shiki failed, falling back to plain', err);
        return null;
    }
}

export { LANGS };
