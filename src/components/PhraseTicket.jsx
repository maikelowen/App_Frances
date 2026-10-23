'use client';

import { useState } from 'react';
import Icon from '@/components/ui/Icon';
import GrammarPractice from '@/components/GrammarPractice';
import { compareSentence, speakable } from '@/lib/compare';
import { useRecorder } from '@/lib/useRecorder';
import { speak } from '@/lib/speech';

const TONES = {
  ok: 'bg-stamp-soft text-stamp',
  almost: 'bg-warn-soft text-warn',
  bad: 'bg-miss-soft text-miss',
};

// Corrección con la frase pintada: subrayadas en rojo las palabras que no se entendieron.
function Feedback({ feedback }) {
  return (
    <div className={`flex flex-col gap-1.5 rounded-xl px-3.5 py-3 ${TONES[feedback.tone]}`}>
      <span className="text-sm font-bold">{feedback.msg}</span>
      {feedback.segments && (
        <span className="display-md text-lg text-ink">
          {feedback.segments.map((seg, i) => (
            <span
              key={i}
              className={seg.ok === false ? 'text-miss underline decoration-wavy decoration-2 underline-offset-4' : seg.ok ? 'text-stamp' : ''}>
              {seg.text}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

function Steps({ heard, spoken, grammar }) {
  const steps = [['Escuchar', heard], ['Decir', spoken], ['Gramática', grammar]];
  return (
    <ol className="flex items-center gap-1.5" aria-label="Pasos de la tarjeta">
      {steps.map(([label, done]) => (
        <li key={label} title={label} className="flex items-center gap-1 text-[0.7rem] text-muted">
          <span className={`grid h-4 w-4 place-items-center rounded-full ${done ? 'bg-stamp text-surface' : 'border border-line'}`}>
            {done && <Icon name="check" size={10} strokeWidth={3.5} />}
          </span>
          <span className="sr-only sm:not-sr-only">{label}</span>
        </li>
      ))}
    </ol>
  );
}

// Una frase para practicar: escucharla, decirla (corrige Whisper) y, si sale bien,
// practicar la gramática con un hueco. `children` va al final del talón (navegación).
export default function PhraseTicket({ card, lang, firstName, label, onSpoken, onGrammar, children }) {
  const [heard, setHeard] = useState(false);
  const [spResult, setSpResult] = useState('');
  const [spFeedback, setSpFeedback] = useState(null);
  const [showGrammar, setShowGrammar] = useState(false);
  const [revealSentence, setRevealSentence] = useState(false);
  const [grammarDone, setGrammarDone] = useState(false);

  // Si la IA dejó un hueco tipo "[nombre]", lo rellenamos con el nombre del usuario.
  const text = firstName ? speakable(card.text, firstName) : card.text;
  const spoken = spFeedback?.tone === 'ok';
  const hideSentence = showGrammar && !revealSentence;

  const escuchar = () => {
    setHeard(true);
    speak(speakable(card.text, firstName), lang, { rate: 0.85 });
  };

  const evaluar = ({ text: said, romanization }) => {
    setSpResult(`Te he entendido: «${said}»${romanization ? ` (${romanization})` : ''}`);
    // Los acentos no cuentan aquí: es el reconocedor quien decide cómo escribir.
    let result = compareSentence(text, said, lang.code, { ignoreAccents: true });
    // En japonés/chino/coreano comparamos también las romanizaciones (kanji frente a hiragana).
    if (card.romanization && romanization) {
      const roman = compareSentence(card.romanization, romanization, 'latin', { ignoreAccents: true });
      if (roman.score > result.score) result = roman;
    }

    if (result.allMatched) {
      setSpFeedback({ tone: 'ok', msg: 'Pronunciación perfecta', segments: result.segments });
    } else if (result.score >= 0.75) {
      setSpFeedback({ tone: 'almost', msg: 'Casi. No se entendieron las palabras marcadas:', segments: result.segments });
    } else {
      setSpFeedback({ tone: 'bad', msg: 'Repítela despacio, palabra a palabra:', segments: result.segments });
    }
    onSpoken?.(result.allMatched);
  };

  const recorder = useRecorder({
    onResult: evaluar,
    onError: (msg) => { setSpResult(msg); setSpFeedback(null); },
  });
  const recording = recorder.status === 'recording';
  const transcribing = recorder.status === 'transcribing';

  const toggleMic = () => {
    if (recorder.status === 'idle') { setSpResult(''); setSpFeedback(null); }
    recorder.toggle();
  };

  return (
    <article className="ticket rise">
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="tag truncate">{label}</span>
          <Steps heard={heard} spoken={spoken} grammar={grammarDone} />
        </div>

        <p className="text-muted">{card.translation}</p>

        {hideSentence ? (
          <div className="flex flex-col items-start gap-1 py-1">
            <span className="display-md select-none text-2xl tracking-[0.3em] text-line" aria-hidden="true">••••••••</span>
            <button onClick={() => setRevealSentence(true)} className="flex items-center gap-1.5 text-sm font-bold text-ink underline underline-offset-2">
              <Icon name="eye" size={16} /> Ver la frase completa
            </button>
          </div>
        ) : card.romanization ? (
          // Idiomas con otra escritura: romanización grande, escritura original debajo.
          <div className="flex flex-col gap-1">
            <p className={`display-md text-[1.7rem] ${spoken ? 'text-stamp' : ''}`}>{card.romanization}</p>
            <p className="text-lg text-muted">{text}</p>
          </div>
        ) : (
          <p className={`display-md text-[1.7rem] ${spoken ? 'text-stamp' : ''}`}>{text}</p>
        )}

        {spoken && !hideSentence && (
          <p className="flex items-center gap-2 text-sm font-bold text-stamp">
            <span className="stamp-mini">Superada</span> Pronunciación perfecta
          </p>
        )}
      </div>

      <div className="ticket-stub flex flex-col gap-3 p-5">
        <div className="grid grid-cols-[3.25rem_1fr] gap-2">
          <button onClick={escuchar} className="btn btn-ghost btn-icon" aria-label="Escuchar la frase">
            <Icon name="speaker" />
          </button>
          <button
            onClick={toggleMic}
            disabled={transcribing}
            className={`btn ${recording ? 'btn-ink animate-pulse' : 'btn-signal'}`}>
            <Icon name={recording ? 'stop' : 'mic'} size={20} />
            {recording ? 'Terminar' : transcribing ? 'Escuchándote…' : spoken ? 'Decirla otra vez' : 'Pulsa y dila'}
          </button>
        </div>

        {!hideSentence && spResult && <p className="text-sm text-muted">{spResult}</p>}
        {!hideSentence && spFeedback && !spoken && <Feedback feedback={spFeedback} />}

        {spoken && !showGrammar && (
          <button onClick={() => setShowGrammar(true)} className="btn btn-ghost w-full">
            <Icon name="pencil" size={18} /> Practicar la gramática
          </button>
        )}
        {showGrammar && (
          <GrammarPractice
            card={card}
            text={text}
            lang={lang}
            firstName={firstName}
            onResult={(ok) => { setGrammarDone(true); onGrammar?.(ok); }}
          />
        )}

        {children}
      </div>
    </article>
  );
}
