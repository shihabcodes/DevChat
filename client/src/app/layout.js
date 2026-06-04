import { GoogleOAuthProvider } from "@react-oauth/google";
import "./globals.css";

export const metadata = {
    title: "DevChat — Real-Time Developer Chat",
    description: "A real-time chat platform built for developers. Share code snippets with syntax highlighting, get AI-powered explanations, and integrate with GitHub.",
    keywords: ["developer chat", "code sharing", "AI code explanation", "real-time messaging"],
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
