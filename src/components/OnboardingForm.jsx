'use client';

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/Icon';
import { saveProfile } from '@/app/onboarding/actions';
import { LANGUAGES, LEVELS, GOAL_MAX, CONTEXT_MAX, NAME_MAX, RELATION_MAX, MAX_COMPANIONS, DAILY_MINUTES } from '@/lib/languages';
import { daysBetween, today } from '@/lib/progress';

const STEPS = ['Nombre', 'Idioma', 'Nivel', 'Objetivo', 'Personas', 'Ritmo'];

const WAITING = [
  'Leyendo tu objetivo…',
  'Eligiendo las situaciones que vas a vivir…',
  'Escribiendo las escenas de conversación…',
  'Preparando tu primer billete…',
];

function Choice({ selected, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-2xl border-2 text-left transition active:scale-[0.98] ${
        selected ? 'border-ink bg-ink text-paper' : 'border-line bg-surface text-ink'
      } ${className}`}>
      {children}
    </button>
  );
}

// Espera mientras la IA crea el plan (unos segundos).
function Generating() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, WAITING.length - 1)), 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex min-h-[70dvh] flex-col justify-center gap-4" aria-live="polite">
      <span className="tag">Preparando tu plan</span>
      <p className="display text-4xl">{WAITING[i]}</p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full bg-signal transition-all duration-[1800ms] ease-out" style={{ width: `${((i + 1) / WAITING.length) * 100}%` }} />
      </div>
    </div>
  );
}

// "Revelación" del plan antes de entrar en la app.
function Reveal({ plan }) {
  const lang = LANGUAGES[plan.language];
  const days = plan.tripDate ? daysBetween(today(), plan.tripDate) : null;
  return (
    <div className="flex flex-col gap-5 py-6">
      <span className="tag">Tu plan está listo</span>
      <section className="rise flex items-end justify-between gap-4 rounded-2xl bg-board px-5 py-5 text-board-ink">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.1em] opacity-60">{lang.flag} Destino</span>
          <span className="display text-3xl">{plan.title}</span>
        </div>
        {days !== null && days >= 0 && (
          <div className="flex shrink-0 flex-col items-end">
            <span className="display text-5xl text-signal tabular-nums">{days}</span>
            <span className="font-mono text-xs uppercase tracking-[0.1em] opacity-70">{days === 1 ? 'día' : 'días'}</span>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="display-md text-xl">{plan.categories.length} temas de frases</h2>
        <div className="flex flex-wrap gap-2">
          {plan.categories.map((c) => <span key={c} className="chip">{c}</span>)}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="display-md text-xl">{plan.scenarios.length} escenas para conversar</h2>
        <ul className="flex flex-col gap-1.5">
          {plan.scenarios.map((s) => (
            <li key={s} className="flex items-center gap-2 rounded-xl bg-surface px-3.5 py-2.5"><Icon name="chat" size={18} className="text-muted" />{s}</li>
          ))}
        </ul>
      </section>

      <p className="text-muted">Cada día tendrás una sesión de {plan.dailyMinutes} minutos con repasos, frases nuevas y una escena.</p>

      {/* Navegación completa para que el servidor lea el perfil recién guardado */}
      <a href="/" className="btn btn-signal w-full">Empezar mi primera sesión <Icon name="arrowRight" size={18} /></a>
    </div>
  );
}

export default function OnboardingForm({ firstName, initial }) {
  const [state, formAction, pending] = useActionState(saveProfile, null);
  const isEditing = Boolean(initial);

  const [step, setStep] = useState(0);
  const [name, setName] = useState(initial?.name ?? firstName ?? '');
  const [language, setLanguage] = useState(initial?.language ?? '');
  const [level, setLevel] = useState(initial?.level ?? '');
  const [goal, setGoal] = useState(initial?.goal ?? '');
  const [tripDate, setTripDate] = useState(initial?.tripDate ?? '');
  const [companions, setCompanions] = useState(initial?.companions?.length ? initial.companions : [{ name: '', relation: '' }]);
  const [minutes, setMinutes] = useState(initial?.dailyMinutes ?? 10);
  const [context, setContext] = useState(initial?.context ?? '');

  // Si el servidor devuelve un error, volvemos al último paso, donde se muestra.
  useEffect(() => { if (state?.error) setStep(STEPS.length - 1); }, [state]);

  if (pending) return <main className="mx-auto max-w-md px-4"><Generating /></main>;
  if (state?.ok) return <main className="mx-auto max-w-md px-4"><Reveal plan={state.plan} /></main>;

  const canContinue = [
    name.trim().length > 0,
    Boolean(language),
    Boolean(level),
    goal.trim().length >= 5,
    true,
    true,
  ][step];
  const last = step === STEPS.length - 1;

  const updateCompanion = (i, field, value) =>
    setCompanions((list) => list.map((c, j) => (j === i ? { ...c, [field]: value } : c)));
  const removeCompanion = (i) =>
    setCompanions((list) => (list.length > 1 ? list.filter((_, j) => j !== i) : [{ name: '', relation: '' }]));

  const next = () => { if (canContinue && !last) setStep(step + 1); };

  return (
    <main
      className="mx-auto flex min-h-full max-w-md flex-col"
      style={{ paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))', paddingRight: 'max(16px, env(safe-area-inset-right, 0px))' }}>
      <form
        action={formAction}
        // Enter avanza de paso en lugar de enviar el formulario antes de tiempo.
        onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && !last) { e.preventDefault(); next(); } }}
        className="flex min-h-[100dvh] flex-col gap-6 py-6">

        <header className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {step > 0 ? (
              <button type="button" onClick={() => setStep(step - 1)} className="btn btn-ghost btn-icon shrink-0" aria-label="Paso anterior"><Icon name="arrowLeft" /></button>
            ) : isEditing ? (
              <Link href="/" className="btn btn-ghost btn-icon shrink-0" aria-label="Cancelar"><Icon name="close" /></Link>
            ) : null}
            <div className="grid flex-1 grid-cols-6 gap-1" aria-hidden="true">
              {STEPS.map((s, i) => <span key={s} className={`h-1.5 rounded-full ${i <= step ? 'bg-ink' : 'bg-line'}`} />)}
            </div>
          </div>
          <span className="tag">{isEditing ? 'Ajusta tu plan · ' : ''}Paso {step + 1} de {STEPS.length}</span>
        </header>

        {/* Todos los pasos están en el formulario (ocultos) para que se envíen juntos al final. */}
        <section hidden={step !== 0} className="flex flex-col gap-4">
          <h1 className="display text-4xl">¿Cómo te llamas?</h1>
          <label htmlFor="name" className="sr-only">Tu nombre</label>
          <input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={NAME_MAX} placeholder="Tu nombre" autoComplete="given-name" className="input text-lg" />
          <p className="text-muted">Lo usaremos en tus frases: «Je m&apos;appelle {name || '…'}».</p>
        </section>

        <section hidden={step !== 1} className="flex flex-col gap-4">
          <h1 className="display text-4xl">¿Qué idioma quieres aprender?</h1>
          <input type="hidden" name="language" value={language} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.values(LANGUAGES).map((l) => (
              <Choice key={l.code} selected={language === l.code} onClick={() => setLanguage(l.code)} className="flex items-center gap-2.5 px-3.5 py-3">
                <span className="text-2xl" aria-hidden="true">{l.flag}</span><span className="font-bold">{l.name}</span>
              </Choice>
            ))}
          </div>
        </section>

        <section hidden={step !== 2} className="flex flex-col gap-4">
          <h1 className="display text-4xl">¿Qué nivel tienes?</h1>
          <input type="hidden" name="level" value={level} />
          <div className="flex flex-col gap-2">
            {Object.entries(LEVELS).map(([key, l]) => (
              <Choice key={key} selected={level === key} onClick={() => setLevel(key)} className="flex flex-col px-4 py-3">
                <span className="font-bold">{l.label}</span>
                <span className={`text-sm ${level === key ? 'opacity-80' : 'text-muted'}`}>{l.description}</span>
              </Choice>
            ))}
          </div>
        </section>

        <section hidden={step !== 3} className="flex flex-col gap-4">
          <h1 className="display text-4xl">¿Para qué lo necesitas?</h1>
          <label htmlFor="goal" className="sr-only">Tu objetivo</label>
          <textarea
            id="goal" name="goal" value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={GOAL_MAX} rows={3}
            placeholder="Ej. Viajo a París en Navidad a conocer a la familia de mi pareja."
            className="input resize-none"
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tripDate" className="font-bold">¿Cuándo es? <span className="font-normal text-muted">(opcional)</span></label>
            <input id="tripDate" name="tripDate" type="date" value={tripDate} min={today()} onChange={(e) => setTripDate(e.target.value)} className="input" />
            <p className="text-sm text-muted">Con una fecha verás la cuenta atrás cada día.</p>
          </div>
        </section>

        <section hidden={step !== 4} className="flex flex-col gap-4">
          <h1 className="display text-4xl">¿Con quién vas o con quién hablarás?</h1>
          <p className="-mt-2 text-muted">Aparecerán en tus frases y conversaciones. Puedes dejarlo en blanco.</p>
          {companions.map((c, i) => (
            <div key={i} className="flex gap-2">
              <label htmlFor={`companion-name-${i}`} className="sr-only">Nombre</label>
              <input id={`companion-name-${i}`} name="companionName" value={c.name} onChange={(e) => updateCompanion(i, 'name', e.target.value)} maxLength={NAME_MAX} placeholder="Nombre" className="input w-2/5 min-w-0" />
              <label htmlFor={`companion-rel-${i}`} className="sr-only">Relación</label>
              <input id={`companion-rel-${i}`} name="companionRelation" value={c.relation} onChange={(e) => updateCompanion(i, 'relation', e.target.value)} maxLength={RELATION_MAX} placeholder="Relación (ej. mi pareja)" className="input min-w-0 flex-1" />
              <button type="button" onClick={() => removeCompanion(i)} aria-label="Quitar persona" className="btn btn-ghost btn-icon shrink-0 min-h-12 w-12"><Icon name="close" size={18} /></button>
            </div>
          ))}
          {companions.length < MAX_COMPANIONS && (
            <button type="button" onClick={() => setCompanions((l) => [...l, { name: '', relation: '' }])} className="flex w-fit items-center gap-1.5 font-bold text-ink">
              <Icon name="plus" size={18} /> Añadir otra persona
            </button>
          )}
        </section>

        <section hidden={step !== 5} className="flex flex-col gap-4">
          <h1 className="display text-4xl">¿Cuánto tiempo al día?</h1>
          <input type="hidden" name="dailyMinutes" value={minutes} />
          <div className="grid grid-cols-3 gap-2">
            {DAILY_MINUTES.map((m) => (
              <Choice key={m} selected={minutes === m} onClick={() => setMinutes(m)} className="flex flex-col items-center px-3 py-4">
                <span className="display text-3xl tabular-nums">{m}</span><span className="text-sm">min</span>
              </Choice>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="context" className="font-bold">¿Algo más que debamos saber? <span className="font-normal text-muted">(opcional)</span></label>
            <textarea
              id="context" name="context" value={context} onChange={(e) => setContext(e.target.value)} maxLength={CONTEXT_MAX} rows={4}
              placeholder="Dónde te alojas, situaciones que te preocupan, temas que te interesan…"
              className="input resize-none"
            />
          </div>
          {state?.error && <p className="rounded-xl bg-miss-soft px-4 py-3 font-bold text-miss">{state.error}</p>}
        </section>

        <div className="mt-auto flex flex-col gap-2">
          {last ? (
            <button type="submit" className="btn btn-signal w-full">
              {isEditing ? 'Guardar y regenerar mi plan' : 'Crear mi plan'} <Icon name="arrowRight" size={18} />
            </button>
          ) : (
            <button type="button" onClick={next} disabled={!canContinue} className="btn btn-signal w-full">
              Siguiente <Icon name="arrowRight" size={18} />
            </button>
          )}
          {isEditing && <p className="text-center text-sm text-muted">Se crearán temas y escenas nuevos. Tu frasebook y tus sellos se mantienen.</p>}
        </div>
      </form>
    </main>
  );
}
