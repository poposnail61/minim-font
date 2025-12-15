import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Minim Font Manager",
    description: "Manage and subset your fonts",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`antialiased`}
            >
                {children}
            </body>
        </html>
    );
}
