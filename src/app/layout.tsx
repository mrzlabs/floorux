import type { Metadata } from 'next';
import Script from 'next/script';
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google';
import '@/styles/globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

const grotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-grotesk',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FloorUX · OperUX',
  description: 'CRM y POS para discotecas, tabernas y bares',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className={`${jakarta.variable} ${grotesk.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=document.cookie.match(/(?:^|; )floorux_theme=([^;]*)/);if(!m)return;var t=JSON.parse(decodeURIComponent(m[1]));var r=document.documentElement;r.setAttribute('data-theme',t.mode==='light'?'light':'dark');if(Array.isArray(t.palette)&&t.palette.length===3){r.style.setProperty('--accent',t.palette[0]);r.style.setProperty('--accent2',t.palette[1]);r.style.setProperty('--accent3',t.palette[2]);}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <Script src="/maylo.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
