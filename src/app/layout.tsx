import type { Metadata } from 'next';
import Script from 'next/script';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'FloorUX · OperUX',
  description: 'CRM y POS para discotecas, tabernas y bares',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Sans:wght@400;600;700;800&family=Syne:wght@400;600;700;800&family=Outfit:wght@400;600;700;800&family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Script src="/maylo.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
