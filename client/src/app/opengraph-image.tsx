import { ImageResponse } from 'next/og';

export const alt = 'DevChat: Real-time chat for developers';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'linear-gradient(135deg, #000000 0%, #0a0a0c 100%)',
                    color: 'white',
                    fontFamily: 'sans-serif',
                    padding: 80,
                    justifyContent: 'space-between',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
                    <div
                        style={{
                            width: 110,
                            height: 110,
                            borderRadius: 24,
                            background: 'linear-gradient(135deg, #141414 0%, #1f1f1f 100%)',
                            border: '2px solid #52a8ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 56,
                            fontWeight: 800,
                            color: '#52a8ff',
                            boxShadow: '0 12px 40px rgba(82, 168, 255, 0.25)',
                        }}
                    >
                        {'</>'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div
                            style={{
                                fontSize: 72,
                                fontWeight: 800,
                                background: 'linear-gradient(90deg, #FFFFFF 0%, #52a8ff 100%)',
                                backgroundClip: 'text',
                                color: 'transparent',
                                lineHeight: 1,
                            }}
                        >
                            DevChat
                        </div>
                        <div style={{ fontSize: 28, color: '#a1a1a1', marginTop: 8 }}>
                            Real-time chat for developers
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontSize: 42, color: '#ededed', lineHeight: 1.3, fontWeight: 700 }}>
                        Stop alt-tabbing to ChatGPT.
                    </div>
                    <div style={{ fontSize: 30, color: '#a1a1a1', lineHeight: 1.3 }}>
                        Share code with syntax highlighting. Get AI explanations
                    </div>
                    <div style={{ fontSize: 30, color: '#a1a1a1', lineHeight: 1.3 }}>
                        streamed inline. Built for flow.
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 16 }}>
                    {['⚡ Sub-50ms WebSockets', '🎨 Shiki Highlighting', '✨ AI Streaming'].map((pill) => (
                        <div
                            key={pill}
                            style={{
                                padding: '14px 24px',
                                borderRadius: 999,
                                background: '#141414',
                                border: '1px solid #2e2e2e',
                                fontSize: 24,
                                color: '#ededed',
                                fontWeight: 600,
                            }}
                        >
                            {pill}
                        </div>
                    ))}
                </div>
            </div>
        ),
        { ...size }
    );
}
