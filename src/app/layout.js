import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs';
import { Archivo, Atkinson_Hyperlegible_Next, IBM_Plex_Mono } from 'next/font/google';

// Archivo (estrecha) para titulares; Atkinson Hyperlegible para leer: está diseñada para
// distinguir bien cada letra y acento, justo lo que necesita quien aprende un idioma.
const archivo = Archivo({ subsets: ['latin', 'latin-ext'], axes: ['wdth'], variable: '--font-archivo' });
const atkinson = Atkinson_Hyperlegible_Next({ subsets: ['latin', 'latin-ext'], variable: '--font-atkinson', adjustFontFallback: false });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-plex-mono' });

export const metadata = {
  title: "TravelLingo",
  description: "Aprende el idioma que necesitas para tu viaje, con práctica personalizada",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TravelLingo",
  },
};

export const viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eceff3" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1524" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html lang="es" className={`${archivo.variable} ${atkinson.variable} ${plexMono.variable}`}>
        <body className="antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
