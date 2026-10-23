'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/Icon';
import { useApp } from '@/components/AppProvider';
import { daysBetween, ensureSession, sessionState, stats, today } from '@/lib/progress';

// "Faltan 58 días" / "Es hoy" / "Ya estás de viaje"
function countdown(tripDate) {
  if (!tripDate) return null;
  const days = daysBetween(today(), tripDate);
  if (days > 1) return { big: String(days), small: 'días' };
  if (days === 1) return { big: '1', small: 'día' };
  if (days === 0) return { big: 'Hoy', small: 'es el día' };
  return { big: '¡Ya!', small: 'estás en ello' };
}

function Stat({ icon, value, label }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-2xl bg-surface px-3.5 py-3">
      <span className="flex items-center gap-1.5 text-muted"><Icon name={icon} size={16} /><span className="text-xs">{label}</span></span>
      <span className="display text-3xl tabular-nums">{value}</span>
    </div>
  );
}

export default function TodayScreen() {
  const { name, profile, lang, progress, ready, update } = useApp();
  const minutes = profile.dailyMinutes ?? 10;

  // Al abrir la app se prepara la sesión del día (si aún no existe).
  useEffect(() => {
    if (ready && progress.sessions[today()]?.planId !== profile.updatedAt) {
      update((p) => ensureSession(p, minutes, profile.scenarios, profile.updatedAt));
    }
  }, [ready, progress, minutes, profile.scenarios, profile.updatedAt, update]);

  const s = ready ? stats(progress) : null;
  const session = ready && progress.sessions[today()]?.planId === profile.updatedAt ? progress.sessions[today()] : null;
  const state = sessionState(session);
  const cd = countdown(profile.tripDate);
  const scene = session?.sceneIndex != null ? profile.scenarios[session.sceneIndex] : null;
  const newCount = session ? session.queue.length - session.reviews + session.missingNew : 0;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="tag">{lang.flag} {lang.name} · {profile.level}</span>
          <h1 className="display text-[2.4rem]">{name ? `Hola, ${name}` : 'Hola'}</h1>
        </div>
        <Link href="/pasaporte" aria-label="Tu pasaporte y ajustes" className="grid h-11 w-11 place-items-center rounded-full bg-ink text-paper display-md text-lg">
          {(name || '?').charAt(0).toUpperCase()}
        </Link>
      </header>

      {/* Panel de salidas: el viaje y la cuenta atrás */}
      <section className="flex items-end justify-between gap-4 rounded-2xl bg-board px-5 py-4 text-board-ink" aria-label="Tu viaje">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.1em] opacity-60">Destino</span>
          <span className="display-md truncate text-xl">{profile.title || profile.goal}</span>
          {profile.tripDate && (
            <span className="font-mono text-xs opacity-70 tabular-nums">
              {new Date(`${profile.tripDate}T12:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          )}
        </div>
        {cd && (
          <div className="flex shrink-0 flex-col items-end">
            <span className="display text-5xl text-signal tabular-nums">{cd.big}</span>
            <span className="font-mono text-xs uppercase tracking-[0.1em] opacity-70">{cd.small}</span>
          </div>
        )}
      </section>

      {/* Sesión del día */}
      <section className="ticket" aria-label="Sesión de hoy">
        <div className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <span className="tag">Tu sesión de hoy · {minutes} min</span>
            {state?.finished && <span className="stamp-mini text-stamp">Hecha</span>}
          </div>
          {!ready || !session ? (
            <p className="text-muted">Preparando tu sesión…</p>
          ) : state.finished ? (
            <>
              <h2 className="display text-3xl">Sesión completada</h2>
              <p className="text-muted">Vuelve mañana para mantener la racha. Si quieres seguir, practica un tema de tu frasebook o una escena.</p>
            </>
          ) : (
            <>
              <h2 className="display text-3xl">{state.doneCount > 0 ? 'Sigue donde lo dejaste' : 'Lista para empezar'}</h2>
              <ul className="flex flex-col gap-1.5 text-[0.95rem]">
                {session.reviews > 0 && <li className="flex items-center gap-2"><Icon name="repeat" size={18} className="text-muted" /> {session.reviews} {session.reviews === 1 ? 'frase' : 'frases'} para repasar</li>}
                {newCount > 0 && <li className="flex items-center gap-2"><Icon name="plus" size={18} className="text-muted" /> {newCount} frases nuevas</li>}
                {scene && <li className="flex items-center gap-2"><Icon name="chat" size={18} className="text-muted" /> Escena: {scene.name}</li>}
              </ul>
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(state.total + session.missingNew, 1)}, 1fr)` }} aria-label={`${state.doneCount} de ${state.total + session.missingNew} hechas`}>
                {Array.from({ length: state.total + session.missingNew }, (_, i) => (
                  <span key={i} className={`h-1.5 rounded-full ${i < state.doneCount ? 'bg-stamp' : 'bg-line'}`} />
                ))}
              </div>
            </>
          )}
        </div>
        <div className="ticket-stub p-5">
          {state?.finished ? (
            <Link href="/frasebook" className="btn btn-ghost w-full">Practicar más <Icon name="arrowRight" size={18} /></Link>
          ) : (
            <Link href="/sesion" aria-disabled={!session} className={`btn btn-signal w-full ${!session ? 'pointer-events-none opacity-50' : ''}`}>
              {state?.doneCount > 0 ? 'Continuar' : 'Empezar sesión'} <Icon name="arrowRight" size={18} />
            </Link>
          )}
        </div>
      </section>

      {s && (
        <section className="grid grid-cols-3 gap-2" aria-label="Tu progreso">
          <Stat icon="flame" value={s.streak} label={s.streak === 1 ? 'día seguido' : 'días seguidos'} />
          <Stat icon="book" value={s.learned} label="frases" />
          <Stat icon="passport" value={s.scenes} label="sellos" />
        </section>
      )}
    </div>
  );
}
