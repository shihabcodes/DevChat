import { ImageResponse } from 'next/og';

export const alt = 'DevChat — Real-time chat for developers';
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
                    background: 'linear-gradient(135deg, #0F0F23 0%, #1A1A3E 100%)',
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
                            background: 'linear-gradient(135deg, #4F46E5 0%, #A855F7 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 56,
                            fontWeight: 800,
                            color: 'white',
                            boxShadow: '0 12px 40px rgba(79,70,229,0.5)',
                        }}
                    >
                        {'</>'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div
                            style={{
                                fontSize: 72,
                                fontWeight: 800,
                                background: 'linear-gradient(90deg, #FFFFFF 0%, #A855F7 100%)',
                                backgroundClip: 'text',
                                color: 'transparent',
                                lineHeight: 1,
                            }}
                        >
                            DevChat
                        </div>
                        <div style={{ fontSize: 28, color: '#9CA3AF', marginTop: 8 }}>
                            Real-time chat for developers
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontSize: 42, color: '#D1D5DB', lineHeight: 1.3 }}>
                        Stop alt-tabbing to ChatGPT.
                    </div>
                    <div style={{ fontSize: 30, color: '#9CA3AF', lineHeight: 1.3 }}>
                        Share code with syntax highlighting. Get AI explanations
                    </div>
                    <div style={{ fontSize: 30, color: '#9CA3AF', lineHeight: 1.3 }}>
                        streamed inline. Built for flow.
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 16 }}>
                    {['⚡ WebSockets', '🎨 Syntax Highlighted', '✨ AI Streaming'].map((pill) => (
                        <div
                            key={pill}
                            style={{
                                padding: '14px 24px',
                                borderRadius: 999,
                                background: '#1A1A3E',
                                border: '1px solid #2D2D5E',
                                fontSize: 24,
                                color: '#D1D5DB',
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
