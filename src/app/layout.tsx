import type { Metadata } from "next";
import { Sora, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { SceneBackground } from "@/components/scene-background";

const sora = Sora({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-sora",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SUNROOOF · Learning",
  description: "Your onboarding at SUNROOOF.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sora.variable} ${inter.variable} ${plexMono.variable}`}>
      <body>
        {/* Slow, blurred 3D skylight behind everything (§2). */}
        <SceneBackground />
        {/* Column on phones (the mobile top bar stacks above the content), a
            row from md up (the sidebar sits beside the content). */}
        <div className="relative flex min-h-screen flex-col md:flex-row">
          <Sidebar />
          <main className="relative min-w-0 flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
