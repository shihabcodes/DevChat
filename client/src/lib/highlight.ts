import { getHighlighter } from 'shiki';

const LANGS: string[] = [
    'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
    'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'html', 'css',
    'sql', 'bash', 'json', 'yaml', 'markdown',
];

let highlighterPromise: Promise<any> | null = null;

export function getClientHighlighter(): Promise<any> | null {
    if (typeof window === 'undefined') return null;
    if (!highlighterPromise) {
        highlighterPromise = getHighlighter({
            themes: ['github-dark'],
            langs: LANGS,
        });
    }
    return highlighterPromise;
}

export async function highlightCode(code: string, language: string = 'text'): Promise<string | null> {
    try {
        const hl = await getClientHighlighter();
        if (!hl) return null;
        const lang = language && LANGS.includes(language) ? language : 'text';
        return hl.codeToHtml(code, { lang, theme: 'github-dark' });
    } catch (err) {
        console.warn('Shiki failed, falling back to plain', err);
        return null;
    }
}

export { LANGS };
