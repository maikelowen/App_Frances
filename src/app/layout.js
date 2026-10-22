import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs';

export const metadata = {
  title: "París A2 - Francés en Familia",
  description: "Aprende francés nivel A2 para el viaje de Navidad a París",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "París A2",
  },
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="es">
        <body className="bg-slate-50 text-slate-900 antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}