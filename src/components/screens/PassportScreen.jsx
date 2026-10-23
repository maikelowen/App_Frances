'use client';

import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import Icon from '@/components/ui/Icon';
import { useApp } from '@/components/AppProvider';
import { describeCompanions } from '@/lib/prompting';
import { stats } from '@/lib/progress';

const shortDate = (d) => new Date(`${d}T12:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

export default function PassportScreen() {
  const { name, profile, lang, progress, ready } = useApp();
  const s = ready ? stats(progress) : null;
  const stamps = ready ? [...progress.passport].reverse() : [];
  const companions = describeCompanions(profile.companions);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="tag">Pasaporte de idiomas</span>
          <h1 className="display text-[2.4rem]">{name || 'Tu pasaporte'}</h1>
        </div>
        <UserButton />
      </header>

      {/* Página de datos del pasaporte */}
      <section className="ticket" aria-label="Tu plan">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 p-5">
          <div><dt className="tag">Idioma</dt><dd className="font-bold">{lang.flag} {lang.name}</dd></div>
          <div><dt className="tag">Nivel</dt><dd className="font-bold">{profile.level}</dd></div>
          <div className="col-span-2"><dt className="tag">Destino</dt><dd className="font-bold">{profile.title || profile.goal}</dd></div>
          {profile.tripDate && <div><dt className="tag">Fecha</dt><dd className="font-bold tabular-nums">{new Date(`${profile.tripDate}T12:00`).toLocaleDateString('es-ES')}</dd></div>}
          <div><dt className="tag">Al día</dt><dd className="font-bold">{profile.dailyMinutes ?? 10} min</dd></div>
          {companions && <div className="col-span-2"><dt className="tag">Con</dt><dd className="font-bold">{companions}</dd></div>}
        </dl>
        <div className="ticket-stub p-4">
          <Link href="/onboarding" className="btn btn-ghost btn-sm w-full"><Icon name="settings" size={16} /> Cambiar mi plan</Link>
        </div>
      </section>

      {s && (
        <section className="grid grid-cols-2 gap-2" aria-label="Estadísticas">
          {[
            ['flame', s.streak, s.streak === 1 ? 'día seguido' : 'días seguidos'],
            ['book', s.learned, 'frases aprendidas'],
            ['check', s.mastered, 'frases dominadas'],
            ['passport', s.scenes, 'sellos'],
          ].map(([icon, value, label]) => (
            <div key={label} className="flex flex-col gap-0.5 rounded-2xl bg-surface px-4 py-3">
              <span className="flex items-center gap-1.5 text-xs text-muted"><Icon name={icon} size={16} />{label}</span>
              <span className="display text-3xl tabular-nums">{value}</span>
            </div>
          ))}
        </section>
      )}

      {/* Página de sellos */}
      <section className="flex flex-col gap-3" aria-label="Sellos">
        <h2 className="display-md text-xl">Sellos</h2>
        {stamps.length === 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {profile.scenarios.slice(0, 3).map((sc, i) => (
              <div key={i} className="grid aspect-square place-items-center rounded-2xl border-2 border-dashed border-line p-2 text-center text-xs text-muted">{sc.name}</div>
            ))}
            <p className="col-span-3 text-sm text-muted">
              Completa una escena en <Link href="/conversar" className="font-bold text-ink underline underline-offset-2">Conversar</Link> para ganar tu primer sello.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-3 gap-3">
            {stamps.map((st, i) => (
              <li
                key={i}
                className="stamp grid aspect-square place-items-center p-2 text-center text-[0.62rem] leading-tight"
                style={{ transform: `rotate(${((i * 37) % 13) - 6}deg)` }}>
                <span>
                  {st.name}
                  <span className="mt-1 block font-mono text-[0.6rem] normal-case tracking-normal">{shortDate(st.date)}{st.twist ? ' · giro' : ''}</span>
                  {st.stars ? <span className="block tracking-normal">{'★'.repeat(st.stars)}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
