import type { Metadata } from 'next';
import Script from 'next/script';
import '@/styles/floorux.css';

export const metadata: Metadata = {
  title: 'FloorUX · OperUX',
  description: 'CRM y POS para discotecas, tabernas y bares',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Script src="/maylo.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
