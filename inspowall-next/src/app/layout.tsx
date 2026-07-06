import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Navbar } from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' });

export const metadata: Metadata = {
  title: 'Vortex',
  description: 'A modern, brutalist image sharing platform.',
};

// Inline, blocking script that applies the .dark class before first paint,
// so there's no flash of the wrong theme while React hydrates.
const noFlashScript = `
(function() {
  try {
    var saved = localStorage.getItem('theme');
    var theme = saved === 'light' || saved === 'dark'
      ? saved
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body className="bg-ink text-ink-invert selection:bg-neon selection:text-ink font-sans transition-colors duration-300" suppressHydrationWarning>
        <Providers>
          <Navbar />
          <main className="pt-24 px-4 md:px-8 pb-12 max-w-[1800px] mx-auto min-h-screen">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
