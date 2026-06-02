import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "TredTrack – Run Further Every Day",
  description: "Track your treadmill workouts, visualize your journey on a 3D map, and crush your goals.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "TredTrack" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-background text-foreground antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
