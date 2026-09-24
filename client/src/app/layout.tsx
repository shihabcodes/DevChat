import type { Metadata, Viewport } from 'next';
import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './globals.css';

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const siteUrl: string = process.env.NEXT_PUBLIC_SITE_URL || 'https://dev-chat-virid.vercel.app';

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: 'DevChat: Real-Time Developer Chat & In-Line AI',
        template: '%s · DevChat',
    },
    description:
        'Real-time chat for developers. Share syntax-highlighted code, stream AI explanations in-line, and collaborate in live channels. Built with Next.js and Supabase.',
    keywords: [
        'developer chat',
        'code sharing',
        'AI code explanation',
        'real-time messaging',
        'OpenAI',
        'Supabase',
        'Next.js',
        'syntax highlighting',
    ],
    authors: [{ name: 'Shihab', url: 'https://github.com/shihabcodes' }],
    creator: 'Shihab',
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: siteUrl,
        siteName: 'DevChat',
        title: 'DevChat: Real-Time Developer Chat & In-Line AI',
        description:
            'Real-time chat for developers. Code highlighting. AI explanations. Built for flow.',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'DevChat: Real-Time Developer Chat & In-Line AI',
        description: 'Real-time chat for developers. Built for flow.',
    },
    robots: {
        index: true,
        follow: true,
    },
};

export const viewport: Viewport = {
    themeColor: '#000000',
    width: 'device-width',
    initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className="dark" suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=Geist+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body style={{ fontFamily: "'Geist', 'Inter', sans-serif" }} suppressHydrationWarning>
                {googleClientId ? (
                    <GoogleOAuthProvider clientId={googleClientId}>{children}</GoogleOAuthProvider>
                ) : (
                    children
                )}
            </body>
        </html>
    );
}
