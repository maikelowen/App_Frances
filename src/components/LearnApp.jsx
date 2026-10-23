'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserButton } from "@clerk/nextjs";
import RoleplayModal from '@/components/RoleplayModal';
import { LANGUAGES, MIX_CATEGORY } from '@/lib/languages';
import { compareSentence } from '@/lib/compare';

const normalize = (s) => s.trim().toLowerCase().replace(/[!?,.¡¿。、！？]/g, '');

const TONE_STYLES = {
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  almost: 'bg-amber-50 text-amber-800 border-amber-200',
  bad: 'bg-rose-50 text-rose-700 border-rose-200',
};

// Mensaje de corrección con la frase objetivo pintada: en rojo las palabras falladas.
function Feedback({ feedback }) {
  return (
    <div className={`p-2.5 rounded-xl text-xs font-semibold text-center border flex flex-col gap-1.5 ${TONE_STYLES[feedback.tone]}`}>
      <span>{feedback.msg}</span>
      {feedback.segments && (
        <span className="text-sm font-bold text-slate-800">
          {feedback.segments.map((seg, i) => (
            <span
              key={i}
              className={seg.ok === false ? 'text-rose-600 underline decoration-wavy decoration-rose-400 underline-offset-4' : seg.ok ? 'text-emerald-700' : ''}>
              {seg.text}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

export default function LearnApp({ userId, profile }) {
  const lang = LANGUAGES[profile.language];
  const categories = [MIX_CATEGORY, ...profile.categories];

  // Claves por usuario y por versión del plan: si cambia el perfil, se empieza de cero.
  const storagePrefix = `tl:${userId}:${profile.updatedAt}`;
  const deckKey = `${storagePrefix}:deck`;
  const seenKey = `${storagePrefix}:seen`;

  // Estados de Flashcards y Mazo
  const [deck, setDeck] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [seenPhrases, setSeenPhrases] = useState([]);
  const [isRoleplayOpen, setIsRoleplayOpen] = useState(false);

  // Estados de interacción
  const [userAnswer, setUserAnswer] = useState('');
  const [exFeedback, setExFeedback] = useState(null);
  const [spResult, setSpResult] = useState('');
  const [spFeedback, setSpFeedback] = useState(null);

  useEffect(() => {
    let seen = [];
    try {
      seen = JSON.parse(localStorage.getItem(seenKey)) || [];
      setSeenPhrases(seen);
    } catch (e) {
      console.error("Error al leer historial de frases", e);
    }

    try {
      const savedDeck = JSON.parse(localStorage.getItem(deckKey));
      if (Array.isArray(savedDeck) && savedDeck.length > 0) {
        setDeck(savedDeck);
        return;
      }
    } catch (e) {
      console.error("Error al leer mazo guardado", e);
    }

    generar10Tarjetas(categories[0], seen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckKey, seenKey]);

  useEffect(() => {
    if (deck.length > 0) {
      localStorage.setItem(deckKey, JSON.stringify(deck));
    }
  }, [deck, deckKey]);

  const hablar = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang.speech;
      utterance.rate = 0.85;
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang.startsWith(lang.code));
      if (voice) utterance.voice = voice;
      window.speechSynthesis.speak(utterance);
    }
  };

  const generar10Tarjetas = async (catTarget, seen = seenPhrases) => {
    setLoadingAi(true);
    setSelectedCategory(catTarget);
    resetCardState();

    try {
      const res = await fetch('/api/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: catTarget,
          seenPhrases: seen.slice(-20)
        })
      });

      const data = await res.json();

      if (data.cards && data.cards.length > 0) {
        const historico = new Set(seen.map(normalize));
        const tarjetasUnicas = data.cards.filter(card => !historico.has(normalize(card.text)));
        const tarjetasFinales = tarjetasUnicas.length > 0 ? tarjetasUnicas : data.cards;

        setDeck(tarjetasFinales);
        setCurrentIndex(0);

        const historialActualizado = Array.from(new Set([...seen, ...tarjetasFinales.map(c => c.text)]));
        setSeenPhrases(historialActualizado);
        localStorage.setItem(seenKey, JSON.stringify(historialActualizado));
      }
    } catch (err) {
      console.error("Error al obtener tarjetas:", err);
    } finally {
      setLoadingAi(false);
    }
  };

  const resetCardState = () => {
    setUserAnswer('');
    setExFeedback(null);
    setSpResult('');
    setSpFeedback(null);
  };

  const nextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % deck.length);
    resetCardState();
  };

  const prevCard = () => {
    setCurrentIndex((prev) => (prev - 1 + deck.length) % deck.length);
    resetCardState();
  };

  const checkAnswer = () => {
    const current = deck[currentIndex];
    if (!current) return;

    if (!userAnswer.trim()) return;

    const exact = compareSentence(current.text, userAnswer, lang.code);
    if (exact.allMatched && exact.extraWords === 0) {
      setExFeedback({ tone: 'ok', msg: "¡Excelente! Escritura perfecta ✨" });
      return;
    }

    const sinAcentos = compareSentence(current.text, userAnswer, lang.code, { ignoreAccents: true });
    if (sinAcentos.allMatched && sinAcentos.extraWords === 0) {
      setExFeedback({ tone: 'almost', msg: "¡Casi! Revisa los acentos de las palabras marcadas:", segments: exact.segments });
    } else {
      const sobran = sinAcentos.extraWords > 0 ? ` (sobran ${sinAcentos.extraWords} palabra${sinAcentos.extraWords > 1 ? 's' : ''})` : '';
      setExFeedback({ tone: 'bad', msg: `Revisa las palabras marcadas${sobran}. La frase correcta es:`, segments: exact.segments });
    }
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("El reconocimiento de voz requiere Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = lang.speech;
    setSpResult("🎙️ Escuchando...");

    recognition.onresult = (event) => {
      const spoken = event.results[0][0].transcript;
      setSpResult(`Escuchado: "${spoken}"`);
      // Los acentos no cuentan aquí: el reconocedor de voz es quien decide cómo escribir.
      const result = compareSentence(deck[currentIndex].text, spoken, lang.code, { ignoreAccents: true });

      if (result.allMatched) {
        setSpFeedback({ tone: 'ok', msg: "¡Pronunciación genial! 🌟", segments: result.segments });
      } else if (result.score >= 0.75) {
        setSpFeedback({ tone: 'almost', msg: "¡Casi! No se entendieron las palabras marcadas:", segments: result.segments });
      } else {
        setSpFeedback({ tone: 'bad', msg: "Repítelo despacio, vocalizando cada palabra:", segments: result.segments });
      }
    };

    recognition.onerror = () => setSpResult("No se captó el audio.");
    recognition.start();
  };

  const currentCard = deck[currentIndex] || { category: selectedCategory, text: "Cargando...", translation: "Cargando frases..." };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-between p-4 selection:bg-sky-500 selection:text-white">

      <div className="w-full max-w-sm flex flex-col gap-4 my-auto">

        {/* Header con Perfil de Clerk */}
        <header className="flex justify-between items-center p-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-lg">{lang.flag}</span>
            <h1 className="font-bold text-xs text-slate-800">{lang.name} {profile.level}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/onboarding" className="text-[11px] font-semibold text-sky-700 hover:text-sky-900">
              Mi plan
            </Link>
            <UserButton />
          </div>
        </header>

        <p className="text-[11px] text-slate-500 px-1 -mt-1 line-clamp-2">🎯 {profile.goal}</p>

        {/* BOTÓN ROLEPLAY PROMINENTE */}
        <button
          onClick={() => setIsRoleplayOpen(true)}
          className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold py-3.5 px-4 rounded-2xl text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition">
          <span className="text-sm">💬</span>
          <span>Simulador de Conversación (Roleplay)</span>
        </button>

        {/* Carrusel de Categorías */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 px-1 -mx-1 touch-pan-x">
          {categories.map((cat, i) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={i}
                disabled={loadingAi}
                onClick={() => generar10Tarjetas(cat)}
                className={`chip-item whitespace-nowrap px-4 py-2.5 rounded-full text-xs font-semibold transition-all active:scale-95 border flex-shrink-0 min-h-[42px] flex items-center justify-center ${
                  isSelected
                    ? 'bg-sky-600 text-white border-sky-600 shadow-sm ring-2 ring-sky-300/60 ring-offset-1'
                    : 'bg-white text-slate-600 border-slate-200/90 hover:bg-slate-100'
                }`}>
                {cat}
              </button>
            );
          })}
          <div className="w-2 flex-shrink-0" />
        </div>

        {/* Estado del Mazo */}
        <div className="flex justify-between items-center text-xs text-slate-500 font-medium px-1">
          <span className="font-semibold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-100">
            {selectedCategory}
          </span>
          <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-md text-slate-700 font-bold">
            {deck.length > 0 ? currentIndex + 1 : 0} / {deck.length}
          </span>
        </div>

        {/* TARJETA UNIFICADA */}
        <div className="bg-white p-5 rounded-3xl shadow-xl shadow-slate-200/60 flex flex-col gap-4 border border-slate-200/80 relative overflow-hidden">

          {loadingAi && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2">
              <svg className="animate-spin h-6 w-6 text-sky-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span className="text-xs font-semibold text-sky-700">Generando 10 frases {profile.level}...</span>
            </div>
          )}

          <div className="text-center flex flex-col gap-1.5 my-1">
            <div className="text-xs text-slate-500 font-medium">{currentCard.translation}</div>
            <div className="text-lg font-bold text-slate-900 tracking-tight leading-snug">{currentCard.text}</div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => hablar(currentCard.text)}
              className="bg-slate-100 hover:bg-slate-200 active:scale-[0.97] text-slate-700 font-semibold py-3 px-3 rounded-2xl text-xs transition border border-slate-200 flex items-center justify-center gap-1.5">
              <span className="text-sm">🔊</span> Escuchar
            </button>

            <button
              onClick={startListening}
              className="bg-sky-600 hover:bg-sky-700 active:scale-[0.97] text-white font-semibold py-3 px-3 rounded-2xl text-xs transition shadow-md shadow-sky-600/20 flex items-center justify-center gap-1.5">
              <span className="text-sm">🎙️</span> Hablar
            </button>
          </div>

          {spResult && <div className="text-center text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-xl">{spResult}</div>}
          {spFeedback && <Feedback feedback={spFeedback} />}

          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
                placeholder={`Escribe en ${lang.name.toLowerCase()}...`}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white transition"
              />
              <button
                onClick={checkAnswer}
                className="bg-slate-800 hover:bg-slate-900 active:scale-[0.97] text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition">
                Validar
              </button>
            </div>

            {exFeedback && <Feedback feedback={exFeedback} />}
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              onClick={prevCard}
              className="flex-1 bg-slate-100 hover:bg-slate-200 active:scale-[0.97] text-slate-700 text-xs py-3 rounded-2xl font-semibold transition border border-slate-200">
              ⬅️ Anterior
            </button>
            <button
              onClick={nextCard}
              className="flex-1 bg-sky-600 hover:bg-sky-700 active:scale-[0.97] text-white text-xs py-3 rounded-2xl font-bold transition shadow-md shadow-sky-600/20">
              Siguiente ➔
            </button>
          </div>

        </div>

      </div>

      <footer className="text-[10px] text-slate-400 font-medium py-2 flex items-center gap-3">
        <span>Práctica {profile.level} • Inmersión Lingüística</span>
        {seenPhrases.length > 0 && (
          <button
            onClick={() => {
              if (confirm("¿Quieres reiniciar el historial de frases aprendidas?")) {
                setSeenPhrases([]);
                localStorage.removeItem(seenKey);
              }
            }}
            className="text-slate-400 underline hover:text-slate-600">
            Limpiar memoria ({seenPhrases.length})
          </button>
        )}
      </footer>

      {/* MODAL DE ROLEPLAY */}
      <RoleplayModal
        isOpen={isRoleplayOpen}
        onClose={() => setIsRoleplayOpen(false)}
        scenarios={profile.scenarios}
        lang={lang}
      />

    </main>
  );
}
