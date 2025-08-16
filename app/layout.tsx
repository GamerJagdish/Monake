import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { FrameProvider } from "@/components/farcaster-provider";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';

import "./globals.css";

const poppins = Poppins({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900']
});

export const metadata: Metadata = {
  title: "Monake on Monad",
  description: "Play Monake and climb up the leaderboard to earn $MON",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (

    <html lang="en" suppressHydrationWarning>
      <body className={poppins.className}>
        <FrameProvider>{children}<SpeedInsights /><Analytics /></FrameProvider>

      </body>
    </html>
  );
}
