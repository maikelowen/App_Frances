'use client';

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SignInButton, SignUpButton, SignOutButton, useAuth } from "@clerk/nextjs";

export default function Landing() {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const refreshed = useRef(false);

  // El servidor pintó la landing pero el navegador sí tiene sesión (p. ej. justo tras
  // iniciar sesión): pedimos al servidor que vuelva a renderizar, una sola vez.
  useEffect(() => {
    if (isSignedIn && !refreshed.current) {
      refreshed.current = true;
      router.refresh();
    }
  }, [isSignedIn, router]);

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-sky-900/20 via-transparent to-transparent pointer-events-none" />

      <nav className="max-w-5xl w-full mx-auto flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">✈️</span>
          <span className="font-bold tracking-tight text-sm sm:text-base">TravelLingo</span>
        </div>
        {isSignedIn ? (
          // Si seguimos aquí con sesión, el servidor no la está aceptando (en desarrollo,
          // normalmente por el reloj del PC desincronizado). Damos una salida en vez de
          // botones de login que Clerk no deja abrir.
          <div className="flex gap-3">
            <SignOutButton>
              <button className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition px-4 py-2">
                Cerrar sesión
              </button>
            </SignOutButton>
            <button
              onClick={() => window.location.reload()}
              className="text-xs sm:text-sm bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 rounded-xl transition shadow-lg shadow-sky-600/20">
              Entrar a la app
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <SignInButton mode="modal" forceRedirectUrl="/">
              <button className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition px-4 py-2">
                Iniciar Sesión
              </button>
            </SignInButton>
            <SignUpButton mode="modal" forceRedirectUrl="/onboarding">
              <button className="text-xs sm:text-sm bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 rounded-xl transition shadow-lg shadow-sky-600/20">
                Empezar Gratis
              </button>
            </SignUpButton>
          </div>
        )}
      </nav>

      <div className="max-w-3xl mx-auto text-center space-y-6 relative z-10 my-auto py-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
          <span>✨</span> Simulador de Inmersión Lingüística
        </div>
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
          Aprende el idioma para tu viaje real.
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
          Cuéntanos a dónde vas y para qué. Entrena frases, pronunciación y conversaciones simuladas adaptadas a tu situación.
        </p>
        <div className="pt-4 flex justify-center">
          {!isSignedIn && (
            <SignUpButton mode="modal" forceRedirectUrl="/onboarding">
              <button className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-8 py-3.5 rounded-2xl text-sm transition shadow-xl shadow-sky-600/30">
                Probar Simulador Gratis ➔
              </button>
            </SignUpButton>
          )}
        </div>
      </div>

      <footer className="max-w-5xl w-full mx-auto text-center text-xs text-slate-600 relative z-10">
        © {new Date().getFullYear()} TravelLingo.
      </footer>
    </main>
  );
}
