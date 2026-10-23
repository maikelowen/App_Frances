'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import { useApp } from '@/components/AppProvider';
import { useRecorder } from '@/lib/useRecorder';
import { speak } from '@/lib/speech';
import { addCards, markSessionScene, recordScene } from '@/lib/progress';

async function postJson(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || 'Error de conexión');
  return data;
}

function Stars({ value }) {
  if (!value) return null;
  return (
    <span className="text-2xl tracking-[0.15em] text-signal" aria-label={`${value} de 5 estrellas`}>
      {'★'.repeat(value)}<span className="text-line">{'★'.repeat(5 - value)}</span>
    </span>
  );
}

// Escena de conversación a pantalla completa: /conversar/[i] (?giro=1 variante, ?sesion=1 desde la sesión diaria).
export default function ConversationScreen({ index }) {
  const { profile, lang, ready, update } = useApp();
  const params = useSearchParams();
  const twist = params.get('giro') === '1';
  const fromSession = params.get('sesion') === '1';
  const scene = profile.scenarios[index];

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState([false, false, false]);
  const [hint, setHint] = useState(null); // { missionIndex, loading? , error?, tip, phrases, words }
  const [micError, setMicError] = useState('');
  const [corrections, setCorrections] = useState([]);
  const [result, setResult] = useState(null); // { stars, advice } al terminar
  const finishedRef = useRef(false);
  const startedRef = useRef(false);
  const endRef = useRef(null);

  const backHref = fromSession ? '/sesion' : '/conversar';

  const start = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await postJson('/api/chat', { scenarioIndex: index, history: [], userMessage: '', twist });
      setMessages([{ sender: 'ai', text: data.reply, translation: data.translation, romanization: data.romanization || null }]);
      speak(data.reply, lang);
    } catch {
      setError('No he podido empezar la escena. Revisa tu conexión y vuelve a intentarlo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ready || !scene || startedRef.current) return;
    startedRef.current = true;
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, scene]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, loading, result]);

  // Si se cumple la misión de la ayuda abierta, la cerramos.
  useEffect(() => { if (hint && completed[hint.missionIndex]) setHint(null); }, [completed, hint]);

  const finish = (data, allCorrections) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setResult({ stars: data.stars ?? null, advice: data.summaryAdvice ?? null });
    update((p) => {
      recordScene(p, { scenarioIndex: index, name: scene.name, stars: data.stars, twist });
      // Las correcciones pasan al frasebook para repasarlas.
      addCards(p, allCorrections.map((c) => ({ ...c, category: scene.name })), 'roleplay');
      if (fromSession) markSessionScene(p);
    });
  };

  const send = async (custom) => {
    const text = (custom ?? input).trim();
    if (!text || loading || result) return;
    const history = messages;
    setMessages([...history, { sender: 'user', text }]);
    setInput('');
    setLoading(true);
    setError('');
    try {
      const data = await postJson('/api/chat', {
        scenarioIndex: index, history, userMessage: text, currentMissionsState: completed, twist,
      });
      const nextCorrections = data.correction ? [...corrections, data.correction] : corrections;
      setCorrections(nextCorrections);
      setCompleted(data.completedMissions);
      setMessages((m) => [...m, {
        sender: 'ai', text: data.reply, translation: data.translation, romanization: data.romanization || null,
        feedback: data.feedback || null, correction: data.correction || null,
      }]);
      speak(data.reply, lang);
      if (data.completedMissions.every(Boolean)) finish(data, nextCorrections);
    } catch {
      setError('No he podido enviar tu mensaje. Inténtalo otra vez.');
      setMessages(history);
      setInput(text);
    } finally {
      setLoading(false);
    }
  };

  const askHint = async (missionIndex) => {
    setHint({ missionIndex, loading: true });
    try {
      const data = await postJson('/api/hint', { scenarioIndex: index, missionIndex, history: messages });
      setHint({ missionIndex, ...data });
    } catch {
      setHint({ missionIndex, error: 'No he podido cargar la ayuda. Inténtalo otra vez.' });
    }
  };

  const recorder = useRecorder({
    onResult: ({ text }) => { setMicError(''); send(text); },
    onError: setMicError,
  });
  const recording = recorder.status === 'recording';
  const transcribing = recorder.status === 'transcribing';

  if (!scene) {
    return (
      <div className="flex flex-col gap-4 pt-6">
        <p className="text-muted">Esta escena no existe en tu plan.</p>
        <Link href="/conversar" className="btn btn-ghost w-fit">Ver escenas</Link>
      </div>
    );
  }

  const nextMission = completed.findIndex((c) => !c);

  return (
    <div className="flex min-h-[calc(100dvh-2rem)] flex-col gap-3 -mb-28">
      {/* Cabecera y misiones */}
      <header className="flex items-start gap-3">
        <Link href={backHref} aria-label="Volver" className="btn btn-ghost btn-icon shrink-0"><Icon name="arrowLeft" /></Link>
        <div className="min-w-0 pt-0.5">
          <span className="tag">Escena{twist ? ' · con giro' : ''}</span>
          <h1 className="display-md truncate text-2xl">{scene.name}</h1>
        </div>
      </header>

      <ol className="grid grid-cols-3 gap-2" aria-label="Misiones">
        {scene.missions.map((m, i) => {
          const done = completed[i];
          const isNext = i === nextMission;
          const short = m.replace(/\s*\(.*\)\s*$/, '');
          return (
            <li key={i}>
              <button
                onClick={() => !done && askHint(i)}
                disabled={done}
                aria-label={`${done ? 'Cumplida' : 'Pendiente'}: ${m}${done ? '' : '. Pulsa para pedir ayuda.'}`}
                className={`flex h-full min-h-[4.5rem] w-full items-center justify-center rounded-xl p-2 text-center text-[0.78rem] leading-tight ${
                  done ? 'stamp stamp-in' : isNext ? 'border-2 border-signal bg-surface text-ink' : 'border-2 border-dashed border-line text-muted'
                }`}>
                {short}
              </button>
            </li>
          );
        })}
      </ol>

      {/* Conversación */}
      <div className="flex flex-1 flex-col gap-2.5 py-2" aria-live="polite">
        {messages.map((msg, i) => msg.sender === 'ai' ? (
          <div key={i} className="flex max-w-[88%] flex-col gap-1.5 self-start">
            {msg.correction && (
              <div className="rounded-xl bg-miss-soft px-3 py-2 text-sm text-ink">
                <span className="font-bold text-miss">Mejor así: </span>{msg.correction.romanization || msg.correction.text}
                {msg.feedback && <span className="mt-0.5 block text-muted">{msg.feedback}</span>}
              </div>
            )}
            {!msg.correction && msg.feedback && (
              <div className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-ink">{msg.feedback}</div>
            )}
            <div className="rounded-2xl rounded-tl-md bg-surface px-3.5 py-2.5">
              <p className="font-bold leading-snug">{msg.romanization || msg.text}</p>
              {msg.romanization && <p className="text-sm text-muted">{msg.text}</p>}
              <p className="mt-1 text-sm text-muted">{msg.translation}</p>
              <button onClick={() => speak(msg.text, lang)} className="mt-1 flex items-center gap-1 text-xs font-bold text-muted" aria-label="Escuchar de nuevo">
                <Icon name="speaker" size={14} /> Escuchar
              </button>
            </div>
          </div>
        ) : (
          <div key={i} className="max-w-[85%] self-end rounded-2xl rounded-tr-md bg-bubble-me px-3.5 py-2.5 text-bubble-me-ink">{msg.text}</div>
        ))}

        {loading && <p className="self-start rounded-2xl bg-surface px-3.5 py-2.5 text-sm text-muted animate-pulse">Escribiendo…</p>}
        {error && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-miss-soft px-3.5 py-2.5 text-sm text-ink">
            <span className="font-bold">{error}</span>
            {messages.length === 0 && <button onClick={start} className="btn btn-ink btn-sm">Reintentar</button>}
          </div>
        )}

        {/* Final: sello, estrellas, consejo y correcciones */}
        {result && (
          <section className="ticket mt-3" aria-label="Escena completada">
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <div className="stamp stamp-in px-5 py-3 text-lg">{scene.name}<span className="mt-0.5 block font-mono text-xs normal-case tracking-normal">Escena superada</span></div>
              <Stars value={result.stars} />
              {result.advice && <p className="max-w-[36ch] text-muted">{result.advice}</p>}
            </div>
            {corrections.length > 0 && (
              <div className="ticket-stub flex flex-col gap-2 p-5">
                <span className="tag">Añadidas a tu frasebook</span>
                <ul className="flex flex-col gap-1.5">
                  {corrections.map((c, i) => (
                    <li key={i}><span className="font-bold">{c.romanization || c.text}</span> <span className="text-sm text-muted">· {c.translation}</span></li>
                  ))}
                </ul>
              </div>
            )}
            <div className="ticket-stub flex flex-col gap-2 p-5">
              <Link href={backHref} className="btn btn-signal w-full">{fromSession ? 'Continuar la sesión' : 'Volver a las escenas'} <Icon name="arrowRight" size={18} /></Link>
              <a href={`/conversar/${index}?giro=1`} className="btn btn-ghost w-full"><Icon name="repeat" size={18} /> Repetir con un giro</a>
            </div>
          </section>
        )}
        <div ref={endRef} />
      </div>

      {/* Ayuda para la misión */}
      {hint && !result && (
        <section className="sticky bottom-[5.5rem] z-10 flex max-h-[45dvh] flex-col gap-2.5 overflow-y-auto rounded-2xl border-2 border-signal bg-surface p-4" aria-label="Ayuda">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm"><span className="flex items-center gap-1 font-bold"><Icon name="bulb" size={16} /> Ayuda</span>{scene.missions[hint.missionIndex]}</p>
            <button onClick={() => setHint(null)} aria-label="Cerrar ayuda" className="btn btn-ghost btn-sm min-h-9 w-9 shrink-0 p-0"><Icon name="close" size={16} /></button>
          </div>
          {hint.loading && <p className="text-sm text-muted animate-pulse">Buscando expresiones útiles…</p>}
          {hint.error && <p className="text-sm font-bold text-miss">{hint.error}</p>}
          {hint.tip && <p className="text-sm text-muted">{hint.tip}</p>}
          {hint.phrases?.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="tag">Toca una para usarla</span>
              {hint.phrases.map((p, i) => (
                <button key={i} onClick={() => { setInput(p.romanization || p.text); speak(p.text, lang); }} className="rounded-xl bg-paper px-3 py-2 text-left">
                  <span className="block font-bold leading-snug">{p.romanization || p.text}</span>
                  {p.romanization && <span className="block text-sm text-muted">{p.text}</span>}
                  <span className="block text-sm text-muted">{p.translation}</span>
                </button>
              ))}
            </div>
          )}
          {hint.words?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {hint.words.map((w, i) => (
                <button key={i} onClick={() => speak(w.text, lang)} className="rounded-full border border-line px-3 py-1 text-sm">
                  <span className="font-bold">{w.romanization || w.text}</span> <span className="text-muted">· {w.translation}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Escribir o hablar */}
      {!result && (
        <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-1.5 border-t border-line bg-paper px-4 pt-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))' }}>
          {micError && <p className="text-sm font-bold text-miss">{micError}</p>}
          {!hint && nextMission >= 0 && messages.length > 0 && (
            <button onClick={() => askHint(nextMission)} className="flex w-fit items-center gap-1.5 text-sm font-bold text-ink underline underline-offset-2">
              <Icon name="bulb" size={16} /> Ayuda para la siguiente misión
            </button>
          )}
          <div className="flex items-center gap-2">
            <label htmlFor="chat-input" className="sr-only">Tu respuesta</label>
            <input
              id="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              disabled={loading || recording}
              placeholder={recording ? 'Te escucho… pulsa para terminar' : transcribing ? 'Escuchándote…' : `Responde en ${lang.name.toLowerCase()}${lang.romanization ? ' o en romanización' : ''}`}
              className="input min-w-0 flex-1"
            />
            {input.trim() ? (
              <button onClick={() => send()} disabled={loading} className="btn btn-ink btn-icon shrink-0" aria-label="Enviar"><Icon name="arrowRight" /></button>
            ) : (
              <button
                onClick={() => { setMicError(''); recorder.toggle(); }}
                disabled={loading || transcribing}
                className={`btn btn-icon shrink-0 ${recording ? 'btn-ink animate-pulse' : 'btn-signal'}`}
                aria-label={recording ? 'Terminar de hablar' : 'Hablar'}>
                <Icon name={recording ? 'stop' : 'mic'} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
