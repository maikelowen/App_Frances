'use client';

import Link from 'next/link';
import Icon from '@/components/ui/Icon';
import { useApp } from '@/components/AppProvider';
import { stampsFor } from '@/lib/progress';

export default function ScenesScreen() {
  const { profile, lang, progress, ready } = useApp();

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <span className="tag">{lang.flag} Escenas de tu viaje</span>
        <h1 className="display text-[2.4rem]">Conversar</h1>
        <p className="text-muted">Situaciones reales de tu plan. Cumple las tres misiones para ganar el sello.</p>
      </header>

      <ul className="flex flex-col gap-3">
        {profile.scenarios.map((scene, i) => {
          const stamps = ready ? stampsFor(progress, scene.name) : [];
          const best = stamps.reduce((max, s) => Math.max(max, s.stars ?? 0), 0);
          return (
            <li key={i} className="ticket">
              <div className="flex items-start gap-4 p-5">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <h2 className="display-md text-xl">{scene.name}</h2>
                  <p className="text-sm text-muted">{scene.role}</p>
                </div>
                {stamps.length > 0 ? (
                  <div className="stamp shrink-0 px-2.5 py-1.5 text-center text-[0.65rem]">
                    {stamps.length === 1 ? 'Sellada' : `×${stamps.length}`}
                    {best > 0 && <span className="block text-xs tracking-normal">{'★'.repeat(best)}</span>}
                  </div>
                ) : (
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-dashed border-line text-muted" aria-label="Sin sello">
                    <Icon name="passport" size={20} />
                  </div>
                )}
              </div>
              <div className="ticket-stub flex gap-2 p-4">
                <Link href={`/conversar/${i}`} className="btn btn-signal btn-sm flex-1">
                  {stamps.length ? 'Practicar otra vez' : 'Empezar'}
                </Link>
                {stamps.length > 0 && (
                  <Link href={`/conversar/${i}?giro=1`} className="btn btn-ghost btn-sm flex-1"><Icon name="repeat" size={16} /> Con giro</Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
