import { ImageResponse } from 'next/og';

export const alt = 'DevChat: team chat that speaks code';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Social card in the same visual language as the site: warm near-black, one amber accent.
export default function OpengraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: 72,
                    background: '#0a0a0b',
                    borderTop: '6px solid #ffb224',
                    color: '#ededef',
                    fontFamily: 'sans-serif',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    <svg width="56" height="56" viewBox="0 0 32 32">
                        <rect width="32" height="32" rx="8" fill="#ededef" />
                        <path d="M9 10.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-6.5L12 25v-3.5H9a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" fill="#0a0a0b" />
                        <path d="m13.5 14-2 2 2 2M18.5 14l2 2-2 2" stroke="#ffb224" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div style={{ fontSize: 36, fontWeight: 600, letterSpacing: -0.5 }}>DevChat</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 88, fontWeight: 600, letterSpacing: -3, lineHeight: 1.02 }}>
                        Team chat that speaks code.
                    </div>
                    <div style={{ marginTop: 28, fontSize: 32, color: '#a0a0a8', lineHeight: 1.35, maxWidth: 900 }}>
                        Syntax-highlighted snippets and streamed AI explanations, right in the thread.
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 24, color: '#6b6b74' }}>
                    <div style={{ display: 'flex', gap: 14 }}>
                        {['Next.js', 'Postgres RLS', 'Realtime', 'Open source'].map((t) => (
                            <div key={t} style={{ display: 'flex', padding: '8px 18px', borderRadius: 999, border: '1px solid #313137', color: '#a0a0a8' }}>
                                {t}
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', color: '#ffb224' }}>Try the live demo →</div>
                </div>
            </div>
        ),
        { ...size },
    );
}
