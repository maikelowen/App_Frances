'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import PhraseTicket from '@/components/PhraseTicket';
import { useApp } from '@/components/AppProvider';
import { generateCards } from '@/lib/cards-api';
import {
  addCards, ensureSession, fillSession, leastPracticedCategory, markSessionCard,
  newCards, recordGrammar, recordSpoken, sessionState, stats, today,
} from '@/lib/progress';

const FREE_PRACTICE_SIZE = 6;

function ProgressBar({ done, total }) {
  return (
    <div className="grid flex-1 gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(total, 1)}, 1fr)` }} aria-label={`${done} de ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-1.5 rounded-full ${i < done ? 'bg-stamp' : i === done ? 'bg-signal' : 'bg-line'}`} />
      ))}
    </div>
  );
}

// Sesión diaria (/sesion) o práctica libre de un tema (/sesion?tema=...).
export default function SessionScreen() {
  const { name, profile, lang, progress, ready, update } = useApp();
  const tema = useSearchParams().get('tema');
  const isFree = Boolean(tema);

  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  // Práctica libre: cola local (no forma parte de la sesión del día).
  const [freeQueue, setFreeQueue] = useState(null);
  const [freeDone, setFreeDone] = useState([]);
  // Primer intento de cada tarjeta en esta pantalla: es el que cuenta para los repasos.
  const attempted = useRef({});
  // Tarjetas dichas correctamente en esta pantalla (habilitan "Siguiente").
  const [okIds, setOkIds] = useState([]);

  const session = ready && progress.sessions[today()]?.planId === profile.updatedAt ? progress.sessions[today()] : null;

  // Sesión diaria: crearla si no existe y generar las frases nuevas que falten.
  useEffect(() => {
    if (!ready || isFree) return;
    if (!session) {
      update((p) => ensureSession(p, profile.dailyMinutes ?? 10, profile.scenarios, profile.updatedAt));
      return;
    }
    if (session.missingNew > 0 && !generating && !error) {
      setGenerating(true);
      const category = leastPracticedCategory(progress, profile.categories);
      generateCards(category, Object.values(progress.cards).map((c) => c.text))
        .then((cards) => update((p) => fillSession(p, addCards(p, cards))))
        .catch(() => setError('No he podido preparar frases nuevas. Revisa tu conexión y vuelve a intentarlo.'))
        .finally(() => setGenerating(false));
    }
  }, [ready, isFree, session, generating, error, progress, profile, update]);

  // Práctica libre: usar frases nuevas del tema o generar más.
  useEffect(() => {
    if (!ready || !isFree || freeQueue) return;
    const available = newCards(progress, tema).slice(0, FREE_PRACTICE_SIZE).map((c) => c.id);
    if (available.length >= 3) { setFreeQueue(available); return; }
    if (generating || error) return;
    setGenerating(true);
    generateCards(tema, Object.values(progress.cards).map((c) => c.text))
      .then((cards) => {
        let ids = [];
        update((p) => { addCards(p, cards); ids = newCards(p, tema).slice(0, FREE_PRACTICE_SIZE).map((c) => c.id); });
        setFreeQueue(ids);
      })
      .catch(() => setError('No he podido generar frases de este tema. Revisa tu conexión y vuelve a intentarlo.'))
      .finally(() => setGenerating(false));
  }, [ready, isFree, freeQueue, progress, tema, generating, error, update]);

  if (!ready) return null;

  const queue = isFree ? freeQueue ?? [] : session?.queue ?? [];
  const done = isFree ? freeDone : session?.done ?? [];
  const pendingIds = queue.filter((id) => !done.includes(id));
  const currentId = pendingIds[0];
  const card = currentId ? progress.cards[currentId] : null;
  const state = isFree ? null : sessionState(session);
  const scene = !isFree && session?.sceneIndex != null ? profile.scenarios[session.sceneIndex] : null;
  const total = isFree ? queue.length : (state?.total ?? 0) + (session?.missingNew ?? 0);
  const doneCount = isFree ? freeDone.length : state?.doneCount ?? 0;

  const handleSpoken = (ok) => {
    const c = progress.cards[currentId];
    if (!c) return;
    const first = !(currentId in attempted.current);
    if (first) attempted.current[currentId] = ok;
    if (ok) setOkIds((ids) => (ids.includes(currentId) ? ids : [...ids, currentId]));
    // Nueva: cuenta el primer acierto. Repaso: cuenta el primer intento (si falla, vuelve a la caja 1).
    if (c.status === 'new' ? ok : first) update((p) => recordSpoken(p, currentId, ok));
  };

  const next = () => {
    if (isFree) setFreeDone((d) => [...d, currentId]);
    else update((p) => markSessionCard(p, currentId));
  };

  const header = (
    <header className="flex items-center gap-3 py-1">
      <Link href={isFree ? '/frasebook' : '/'} aria-label="Salir" className="btn btn-ghost btn-icon shrink-0">
        <Icon name="close" />
      </Link>
      <ProgressBar done={doneCount} total={total} />
    </header>
  );

  if (error) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <div className="rounded-2xl bg-miss-soft p-5 text-ink">
          <p className="font-bold">{error}</p>
          <button onClick={() => setError('')} className="btn btn-ink btn-sm mt-3">Reintentar</button>
        </div>
      </div>
    );
  }

  // Tarjeta en curso
  if (card) {
    const isReview = !isFree && session.queue.indexOf(currentId) < session.reviews;
    const label = `${isReview ? 'Repaso' : 'Nueva'} · ${card.category ?? ''}`;
    return (
      <div className="flex flex-col gap-5">
        {header}
        <PhraseTicket
          key={currentId}
          card={card}
          lang={lang}
          firstName={name}
          label={label}
          onSpoken={handleSpoken}
          onGrammar={(ok) => update((p) => recordGrammar(p, currentId, ok))}>
          <button onClick={next} className={`btn w-full ${okIds.includes(currentId) ? 'btn-signal' : 'btn-ghost'}`}>
            {okIds.includes(currentId) ? 'Siguiente' : 'Saltar por ahora'} <Icon name="arrowRight" size={18} />
          </button>
        </PhraseTicket>
      </div>
    );
  }

  // Aún preparando la sesión o generando frases
  if (generating || (!isFree && (!session || session.missingNew > 0)) || (isFree && !freeQueue)) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <div className="ticket flex flex-col items-start gap-2 p-6">
          <span className="tag">Preparando</span>
          <p className="display-md text-2xl">Escribiendo frases para tu viaje…</p>
          <p className="text-muted">Las adapto a tu nivel y a las personas de tu plan.</p>
        </div>
      </div>
    );
  }

  // Escena del día
  if (scene && !session.sceneDone) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <section className="ticket">
          <div className="flex flex-col gap-2 p-5">
            <span className="tag">Escena del día</span>
            <h1 className="display text-3xl">{scene.name}</h1>
            <p className="text-muted">{scene.role}</p>
            <ul className="mt-1 flex flex-col gap-1 text-[0.95rem]">
              {scene.missions.map((m) => <li key={m} className="flex gap-2"><Icon name="check" size={18} className="mt-0.5 shrink-0 text-line" />{m}</li>)}
            </ul>
          </div>
          <div className="ticket-stub p-5">
            <Link href={`/conversar/${session.sceneIndex}?sesion=1`} className="btn btn-signal w-full">
              Empezar la escena <Icon name="arrowRight" size={18} />
            </Link>
          </div>
        </section>
      </div>
    );
  }

  // Terminado
  const s = stats(progress);
  return (
    <div className="flex flex-col gap-6">
      {header}
      <section className="flex flex-col items-center gap-5 pt-6 text-center">
        <div className="stamp stamp-in px-6 py-4 text-xl">
          {isFree ? 'Tema practicado' : 'Sesión completada'}
          <span className="mt-1 block font-mono text-xs normal-case tracking-normal">{new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
        </div>
        <h1 className="display text-4xl">{isFree ? '¡Bien hecho!' : `${s.streak} ${s.streak === 1 ? 'día' : 'días'} seguidos`}</h1>
        <p className="max-w-[32ch] text-muted">
          {isFree
            ? 'Estas frases ya están en tu frasebook. Volverán para repasarlas en los próximos días.'
            : 'Las frases de hoy volverán para repasarlas justo cuando empieces a olvidarlas.'}
        </p>
      </section>
      <div className="flex flex-col gap-2">
        <Link href={isFree ? '/frasebook' : '/'} className="btn btn-signal w-full">{isFree ? 'Volver al frasebook' : 'Volver a Hoy'}</Link>
        {!isFree && <Link href="/conversar" className="btn btn-ghost w-full">Practicar una escena</Link>}
      </div>
    </div>
  );
}
