'use client';

import { useState } from 'react';
import { splitAround, fallbackGrammar, checkWord } from '@/lib/cloze';

// Frase con un hueco: el hueco se muestra vacío hasta acertar (o ver la respuesta).
function Cloze({ parts, filled, className }) {
  return (
    <span className={className}>
      {parts.before}
      <span
        className={`mx-0.5 inline-block min-w-[3.5ch] border-b-[3px] px-1 align-baseline ${
          filled ? 'border-stamp text-stamp' : 'select-none border-signal text-transparent'
        }`}>
        {filled ? parts.answer : parts.answer.replace(/./gu, '·')}
      </span>
      {parts.after}
    </span>
  );
}

// Práctica opcional tras pronunciar bien la tarjeta: escribir la palabra que falta.
export default function GrammarPractice({ card, text, lang, firstName, onResult }) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null); // 'ok' | 'almost' | 'bad' | 'revealed'

  const grammar = card.grammar ?? fallbackGrammar(text, lang.code, firstName);
  const nativeParts = grammar && splitAround(text, grammar.word, lang.code);
  if (!nativeParts) return null;

  // En japonés/chino/coreano también mostramos (y aceptamos) el hueco en la romanización.
  const romanParts = card.romanization && grammar.wordRomanization
    ? splitAround(card.romanization, grammar.wordRomanization, 'latin')
    : null;

  const solved = result === 'ok' || result === 'revealed';

  const comprobar = () => {
    const tone = checkWord(input, [nativeParts.answer, romanParts?.answer], {
      // En romaji las marcas de vocal larga son opcionales; en pinyin son tonos y sí cuentan.
      accentsOptional: Boolean(romanParts) && lang.code !== 'zh',
    });
    if (!tone) return;
    setResult(tone);
    if (tone === 'ok') onResult?.(true);
  };

  const revelar = () => {
    setResult('revealed');
    onResult?.(false);
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-paper p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="tag">Completa la frase</span>
        {grammar.hint && <span className="text-sm text-ink">{grammar.hint}</span>}
      </div>

      <p className="leading-relaxed">
        {romanParts ? (
          <>
            <Cloze parts={romanParts} filled={solved} className="display-md block text-xl" />
            <Cloze parts={nativeParts} filled={solved} className="mt-1 block text-muted" />
          </>
        ) : (
          <Cloze parts={nativeParts} filled={solved} className="display-md text-xl" />
        )}
      </p>

      {!solved && (
        <div className="flex gap-2">
          <label htmlFor="cloze-answer" className="sr-only">La palabra que falta</label>
          <input
            id="cloze-answer"
            type="text"
            value={input}
            autoFocus
            onChange={(e) => { setInput(e.target.value); if (result) setResult(null); }}
            onKeyDown={(e) => e.key === 'Enter' && comprobar()}
            placeholder="La palabra que falta"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="input min-w-0 flex-1"
          />
          <button onClick={comprobar} disabled={!input.trim()} className="btn btn-ink btn-sm min-h-12">
            Comprobar
          </button>
        </div>
      )}

      {result === 'almost' && (
        <p className="text-sm font-bold text-warn">Casi. Revisa {lang.code === 'zh' ? 'los tonos' : 'los acentos'}.</p>
      )}
      {result === 'bad' && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="font-bold text-miss">No es esa palabra. Prueba otra vez.</span>
          <button onClick={revelar} className="text-muted underline underline-offset-2">Ver respuesta</button>
        </div>
      )}
      {solved && (
        <div className={`rounded-xl px-3.5 py-2.5 text-sm ${result === 'ok' ? 'bg-stamp-soft text-ink' : 'bg-surface text-ink'}`}>
          <p className="font-bold">
            {result === 'ok'
              ? '¡Correcto!'
              : `La respuesta era «${romanParts ? `${romanParts.answer} (${nativeParts.answer})` : nativeParts.answer}».`}
          </p>
          {grammar.explanation && <p className="mt-0.5 text-muted">{grammar.explanation}</p>}
        </div>
      )}
    </div>
  );
}
