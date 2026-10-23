'use client';

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SignInButton, SignUpButton, SignOutButton, useAuth } from "@clerk/nextjs";
import Icon from "@/components/ui/Icon";

// Ejemplo de lo que genera la app para un viaje real (contenido de muestra).
const SAMPLE = {
  route: "FR → ES · A2",
  translation: "Me gustaría brindar por Bao-Chau y por Mai.",
  sentence: "Je voudrais porter un toast à Bao-Chau et à Mai !",
};

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
    <main
      className="mx-auto flex min-h-full max-w-5xl flex-col gap-12 py-6"
      style={{ paddingLeft: "max(16px, env(safe-area-inset-left, 0px))", paddingRight: "max(16px, env(safe-area-inset-right, 0px))" }}>
      <nav className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-2 display-md text-lg"><Icon name="plane" size={20} /> TravelLingo</span>
        {isSignedIn ? (
          // Si seguimos aquí con sesión, el servidor no la está aceptando (en desarrollo,
          // normalmente por el reloj del PC desincronizado). Damos una salida.
          <div className="flex gap-2">
            <SignOutButton><button className="btn btn-ghost btn-sm">Cerrar sesión</button></SignOutButton>
            <button onClick={() => window.location.reload()} className="btn btn-ink btn-sm">Entrar a la app</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <SignInButton mode="modal" forceRedirectUrl="/"><button className="btn btn-ghost btn-sm">Iniciar sesión</button></SignInButton>
            <SignUpButton mode="modal" forceRedirectUrl="/onboarding"><button className="btn btn-ink btn-sm">Crear cuenta</button></SignUpButton>
          </div>
        )}
      </nav>

      <section className="grid items-center gap-10 md:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col gap-5">
          <span className="tag">Para un viaje, una entrevista o una mudanza</span>
          <h1 className="display text-[clamp(2.6rem,8vw,4.6rem)]">
            Aprende el idioma de tu <mark className="bg-signal px-[0.12em] text-signal-ink">próximo viaje</mark>
          </h1>
          <p className="max-w-[48ch] text-lg text-muted">
            Cuéntanos a dónde vas, con quién y cuándo. Cada día practicas las frases que vas a necesitar allí, con tu nombre y el de tu gente, y ensayas las conversaciones antes de vivirlas.
          </p>
          {!isSignedIn && (
            <SignUpButton mode="modal" forceRedirectUrl="/onboarding">
              <button className="btn btn-signal w-full sm:w-fit">Crear mi plan gratis <Icon name="arrowRight" size={18} /></button>
            </SignUpButton>
          )}
        </div>

        {/* Muestra: una tarjeta real del producto */}
        <figure className="flex flex-col gap-2">
          <article className="ticket rotate-[1.5deg] shadow-[0_18px_40px_-24px_rgba(21,33,59,0.45)]">
            <div className="flex flex-col gap-2 p-5">
              <span className="tag">{SAMPLE.route} · Cenas y brindis</span>
              <p className="text-muted">{SAMPLE.translation}</p>
              <p className="display-md text-[1.6rem] text-stamp">{SAMPLE.sentence}</p>
              <p className="flex items-center gap-2 text-sm font-bold text-stamp"><span className="stamp-mini">Superada</span> Pronunciación perfecta</p>
            </div>
            <div className="ticket-stub grid grid-cols-[3.25rem_1fr] gap-2 p-5">
              <span className="btn btn-ghost btn-icon" aria-hidden="true"><Icon name="speaker" /></span>
              <span className="btn btn-signal" aria-hidden="true"><Icon name="mic" size={20} /> Pulsa y dila</span>
            </div>
          </article>
          <figcaption className="text-center text-sm text-muted">Ejemplo de frase para una Navidad en París.</figcaption>
        </figure>
      </section>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Cómo funciona">
        {[
          ["today", "Una sesión al día", "Repasos, frases nuevas y una escena, en 5, 10 o 15 minutos. Con cuenta atrás hasta tu viaje."],
          ["mic", "Hablas desde el primer día", "Dices cada frase en voz alta y ves qué palabras se entendieron y cuáles no."],
          ["passport", "Ensayas lo que vas a vivir", "Conversaciones con personajes de tu viaje. Cada escena superada es un sello en tu pasaporte."],
        ].map(([icon, title, text]) => (
          <div key={title} className="flex flex-col gap-1.5 rounded-2xl bg-surface p-5">
            <Icon name={icon} className="text-ink" />
            <h2 className="display-md text-xl">{title}</h2>
            <p className="text-muted">{text}</p>
          </div>
        ))}
      </section>

      <footer className="pb-4 text-sm text-muted">© {new Date().getFullYear()} TravelLingo</footer>
    </main>
  );
}
