'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { saveProfile } from '@/app/onboarding/actions';
import { LANGUAGES, LEVELS, GOAL_MAX, CONTEXT_MAX } from '@/lib/languages';

export default function OnboardingForm({ firstName, initial }) {
  const [state, formAction, pending] = useActionState(saveProfile, null);
  const [language, setLanguage] = useState(initial?.language ?? '');
  const [level, setLevel] = useState(initial?.level ?? '');
  const isEditing = Boolean(initial);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 flex justify-center p-4">
      <form action={formAction} className="w-full max-w-md flex flex-col gap-6 py-6">

        <header className="flex flex-col gap-1">
          <h1 className="text-xl font-black tracking-tight">
            {isEditing ? 'Ajusta tu plan' : `¡Hola${firstName ? `, ${firstName}` : ''}! Vamos a preparar tu plan`}
          </h1>
          <p className="text-xs text-slate-500">
            Con estas respuestas crearemos frases y conversaciones pensadas para tu situación concreta.
          </p>
        </header>

        {/* 1. Idioma */}
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold">1. ¿Qué idioma quieres aprender?</h2>
          <input type="hidden" name="language" value={language} />
          <div className="grid grid-cols-3 gap-2">
            {Object.values(LANGUAGES).map((l) => (
              <button
                type="button"
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className={`flex flex-col items-center gap-1 py-3 rounded-2xl border text-xs font-semibold transition active:scale-95 ${
                  language === l.code
                    ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                    : 'bg-white border-slate-200 hover:bg-slate-100'
                }`}>
                <span className="text-xl">{l.flag}</span>
                {l.name}
              </button>
            ))}
          </div>
        </section>

        {/* 2. Nivel */}
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold">2. ¿Qué nivel tienes?</h2>
          <input type="hidden" name="level" value={level} />
          <div className="flex flex-col gap-2">
            {Object.entries(LEVELS).map(([key, l]) => (
              <button
                type="button"
                key={key}
                onClick={() => setLevel(key)}
                className={`flex justify-between items-center px-4 py-3 rounded-2xl border text-left transition active:scale-[0.98] ${
                  level === key
                    ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                    : 'bg-white border-slate-200 hover:bg-slate-100'
                }`}>
                <span className="text-xs font-bold">{l.label}</span>
                <span className={`text-[11px] ${level === key ? 'text-sky-100' : 'text-slate-500'}`}>{l.description}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 3. Objetivo */}
        <section className="flex flex-col gap-2">
          <label htmlFor="goal" className="text-sm font-bold">3. ¿Para qué lo necesitas exactamente?</label>
          <textarea
            id="goal"
            name="goal"
            required
            maxLength={GOAL_MAX}
            rows={3}
            defaultValue={initial?.goal ?? ''}
            placeholder="Ej. Viajo a París en Navidad a conocer a la familia de mi pareja."
            className="bg-white border border-slate-200 rounded-2xl px-3.5 py-3 text-xs placeholder-slate-400 focus:outline-none focus:border-sky-500 transition resize-none"
          />
        </section>

        {/* 4. Contexto */}
        <section className="flex flex-col gap-2">
          <label htmlFor="context" className="text-sm font-bold">
            4. Cuéntanos un poco más <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <textarea
            id="context"
            name="context"
            maxLength={CONTEXT_MAX}
            rows={4}
            defaultValue={initial?.context ?? ''}
            placeholder="Con quién vas, cuánto tiempo, situaciones que te preocupan, temas que te interesan…"
            className="bg-white border border-slate-200 rounded-2xl px-3.5 py-3 text-xs placeholder-slate-400 focus:outline-none focus:border-sky-500 transition resize-none"
          />
        </section>

        {state?.error && (
          <div className="p-3 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            {state.error}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={pending || !language || !level}
            className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl text-sm transition shadow-lg shadow-sky-600/20">
            {pending ? 'Preparando tu plan personalizado…' : isEditing ? 'Guardar y regenerar mi plan' : 'Crear mi plan ➔'}
          </button>
          {isEditing && !pending && (
            <Link href="/" className="text-center text-xs text-slate-500 underline hover:text-slate-700">
              Cancelar
            </Link>
          )}
        </div>

      </form>
    </main>
  );
}
