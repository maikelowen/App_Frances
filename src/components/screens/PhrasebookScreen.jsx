'use client';

import { useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/Icon';
import { useApp } from '@/components/AppProvider';
import { speakable } from '@/lib/compare';
import { speak } from '@/lib/speech';
import { today } from '@/lib/progress';

const FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'review', label: 'Para repasar' },
  { id: 'learning', label: 'Aprendiendo' },
  { id: 'mastered', label: 'Dominadas' },
];

function statusOf(card, day) {
  if (card.status === 'mastered') return { id: 'mastered', label: 'Dominada', cls: 'bg-stamp-soft text-stamp' };
  if (card.status === 'learning' && card.due && card.due <= day) return { id: 'review', label: 'Repasar hoy', cls: 'bg-warn-soft text-warn' };
  if (card.status === 'learning') return { id: 'learning', label: 'Aprendiendo', cls: 'bg-paper text-ink' };
  return { id: 'new', label: 'Nueva', cls: 'bg-paper text-muted' };
}

export default function PhrasebookScreen() {
  const { name, profile, lang, progress, ready } = useApp();
  const [filter, setFilter] = useState('all');
  if (!ready) return null;

  const day = today();
  // Solo lo practicado (las frases aún sin estrenar esperan en la sesión), más las correcciones de escenas.
  const cards = Object.values(progress.cards).filter((c) => c.status !== 'new' || c.source === 'roleplay');
  const visible = cards.filter((c) => filter === 'all' || statusOf(c, day).id === filter);
  // Las correcciones de las escenas van a su propio apartado.
  const sections = [...profile.categories, 'Correcciones de tus escenas']
    .map((cat) => ({
      cat,
      cards: visible.filter((c) => (c.source === 'roleplay' ? 'Correcciones de tus escenas' : c.category) === cat),
      learned: Object.values(progress.cards).filter((c) => c.category === cat && c.status !== 'new').length,
    }))
    .filter((s) => s.cards.length > 0 || (filter === 'all' && profile.categories.includes(s.cat)));

  const totalLearned = Object.values(progress.cards).filter((c) => c.status !== 'new').length;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <span className="tag">{lang.flag} Tu guía de conversación</span>
        <h1 className="display text-[2.4rem]">Frasebook</h1>
        <p className="text-muted">
          {totalLearned > 0
            ? `${totalLearned} ${totalLearned === 1 ? 'frase aprendida' : 'frases aprendidas'}. Llévalas contigo en el viaje.`
            : 'Aquí se guardan las frases que vas aprendiendo, con su audio, para tenerlas a mano en el viaje.'}
        </p>
      </header>

      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1" role="group" aria-label="Filtrar frases">
        {FILTERS.map((f) => (
          <button key={f.id} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} className="chip">{f.label}</button>
        ))}
      </div>

      {sections.length === 0 && (
        <p className="rounded-2xl bg-surface p-5 text-muted">No hay frases en este apartado todavía.</p>
      )}

      {sections.map(({ cat, cards: list, learned }) => (
        <section key={cat} className="flex flex-col gap-2">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="display-md truncate text-xl">{cat}</h2>
              {profile.categories.includes(cat) && <span className="tag tabular-nums">{learned} aprendidas</span>}
            </div>
            {profile.categories.includes(cat) && (
              <Link href={`/sesion?tema=${encodeURIComponent(cat)}`} className="btn btn-ghost btn-sm shrink-0">
                Practicar <Icon name="arrowRight" size={16} />
              </Link>
            )}
          </div>

          {list.length === 0 ? (
            <p className="rounded-2xl border-2 border-dashed border-line px-4 py-3 text-sm text-muted">Aún no has practicado este tema.</p>
          ) : (
            <ul className="flex flex-col overflow-hidden rounded-2xl bg-surface">
              {list.map((c) => {
                const st = statusOf(c, day);
                const text = name ? speakable(c.text, name) : c.text;
                return (
                  <li key={c.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-bold leading-snug">{c.romanization || text}</span>
                      {c.romanization && <span className="text-sm text-muted">{text}</span>}
                      <span className="text-sm text-muted">{c.translation}</span>
                      <span className={`mt-1 w-fit rounded-md px-2 py-0.5 text-xs font-bold ${st.cls}`}>{st.label}</span>
                    </div>
                    <button onClick={() => speak(speakable(c.text, name), lang)} className="btn btn-ghost btn-icon shrink-0" aria-label={`Escuchar: ${text}`}>
                      <Icon name="speaker" size={20} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
