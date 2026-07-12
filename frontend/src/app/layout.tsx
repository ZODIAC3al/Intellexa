import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['sans-serif' as any],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['monospace' as any],
});

export const metadata: Metadata = {
  title: 'Intellexa — Dual-Mode AI RAG Workbench',
  description: 'Cloud speed or local privacy — one unified workbench for generative research and secure vector retrieval.',
  openGraph: {
    title: 'Intellexa — Dual-Mode AI RAG Workbench',
    description: 'Cloud speed or local privacy — one unified workbench.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var theme = localStorage.getItem('intellexa-theme') || 'intellexa-dark';
                document.documentElement.setAttribute('data-theme', theme);
                if (theme === 'intellexa-dark' || theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-base-100 text-base-content antialiased selection:bg-primary/30">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
