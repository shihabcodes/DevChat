import { GoogleOAuthProvider } from "@react-oauth/google";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://devchat.app';

export const metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: "DevChat: Real-Time Developer Chat & In-Line AI",
        template: "%s · DevChat",
    },
    description:
        "Real-time chat built for developer flow. Share code with syntax highlighting across 20+ languages, stream AI explanations in-line, and collaborate in sub-50ms channels.",
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
        title: "DevChat: Real-Time Developer Chat & In-Line AI",
        description:
            "Real-time chat for developers. Code highlighting. AI explanations. Built for flow.",
    },
    twitter: {
        card: "summary_large_image",
        title: "DevChat: Real-Time Developer Chat & In-Line AI",
        description: "Real-time chat for developers. Built for flow.",
    },
    robots: {
        index: true,
        follow: true,
    },
};

export const viewport = {
    themeColor: "#000000",
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
                    href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=Geist+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body style={{ fontFamily: "'Geist', 'Inter', sans-serif" }} suppressHydrationWarning>
                <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}>
                    {children}
                </GoogleOAuthProvider>
            </body>
        </html>
    );
}
