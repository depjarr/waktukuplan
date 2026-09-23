import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { ThemeBoot } from '@/components/ThemeBoot';
import '@/styles/base.css';
import '@/styles/layout.css';
import '@/styles/calendar.css';
import '@/styles/itinerary.css';
import '@/styles/panels.css';
import '@/styles/dialogs.css';
import '@/styles/auth.css';

export const metadata: Metadata = {
  title: 'waktukuplan',
  description: 'Jurnal jadwal yang bisa ditulis sendiri atau lewat AI',
  icons: { icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22><circle cx=%2216%22 cy=%2216%22 r=%2211%22 fill=%22white%22 stroke=%22%23C2416A%22 stroke-width=%222.4%22/><path d=%22M16 9.5v7l4.5 2.5%22 fill=%22none%22 stroke=%22%23C2416A%22 stroke-width=%222.4%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/></svg>' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

// Dijalankan sebelum halaman tampil: pasang tema tersimpan supaya tidak berkedip.
const THEME_SCRIPT = `(function(){try{var r=document.documentElement,v=JSON.parse(localStorage.getItem('wkp_vars')||'null');if(v){for(var k in v.vars)r.style.setProperty(k,v.vars[k]);r.dataset.mode=v.mode}else if(matchMedia('(prefers-color-scheme: dark)').matches){r.dataset.mode='dark'}}catch(e){}})()`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Karla:wght@400;500;600&family=Lora:wght@500;600;700&family=Gaegu:wght@400;700&family=Caveat:wght@400;700&family=Patrick+Hand&family=Nanum+Pen+Script&family=Shadows+Into+Light&family=Inter:wght@400;500;600&family=Nunito:wght@400;600;700&family=Poppins:wght@400;500;600&family=Work+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ThemeBoot />
        {children}
      </body>
    </html>
  );
}