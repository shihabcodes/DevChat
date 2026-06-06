import { GoogleOAuthProvider } from "@react-oauth/google";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://devchat.app';

export const metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: "DevChat — Real-Time Developer Chat",
        template: "%s · DevChat",
    },
    description:
        "A real-time chat platform built for developers. Share code with syntax highlighting, get AI explanations streamed in-line, and collaborate without breaking flow.",
    keywords: [
        "developer chat",
        "code sharing",
        "AI code explanation",
        "real-time messaging",
        "OpenAI",
        "syntax highlighting",
    ],
    authors: [{ name: "DevChat" }],
    creator: "DevChat",
    openGraph: {
        type: "website",
        locale: "en_US",
        url: siteUrl,
        siteName: "DevChat",
        title: "DevChat — Real-Time Developer Chat",
        description:
            "Real-time chat for developers. Code highlighting. AI explanations. Built for flow.",
    },
    twitter: {
        card: "summary_large_image",
        title: "DevChat — Real-Time Developer Chat",
        description: "Real-time chat for developers. Built for flow.",
    },
    robots: {
        index: true,
        follow: true,
    },
};

export const viewport = {
    themeColor: "#0F0F23",
    width: "device-width",
    initialScale: 1,
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" className="dark" suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body style={{ fontFamily: "'Inter', sans-serif" }} suppressHydrationWarning>
                <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}>
                    {children}
                </GoogleOAuthProvider>
            </body>
        </html>
    );
}
