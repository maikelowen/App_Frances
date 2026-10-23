import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs';

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

export default function RootLayout({ children }) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html lang="es">
        <body className="bg-slate-50 text-slate-900 antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}