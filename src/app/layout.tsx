import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'OinkSync — Pig Farm Financial OS',
  description: 'Track investments, inventory, expenses, and analytics for modern pig farming operations.',
  keywords: 'pig farm, livestock management, farm finance, PiggyTrack',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
