'use client';

import { useState, useEffect } from 'react';
import RoleplayModal from '@/components/RoleplayModal';

const CATEGORIES = [
  "🔀 Mix Variado",
  "🎄 Cenas y Brindis",
  "👶 La bebé Mai",
  "👋 Presentaciones",
  "🍽️ En la mesa",
  "🥖 Compras y Cafés",
  "🚇 Moverse por París"
];

export default function Home() {
  const [deck, setDeck] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [seenPhrases, setSeenPhrases] = useState([]);
  const [isRoleplayOpen, setIsRoleplayOpen] = useState(false);
  
  // Estados de interacción
  const [userAnswer, setUserAnswer] = useState('');
  const [exFeedback, setExFeedback] = useState(null);
  const [spResult, setSpResult] = useState('');
  const [spFeedback, setSpFeedback] = useState(null);

  useEffect(() => {
    const savedDeck = localStorage.getItem('paris_deck');
    const savedSeen = localStorage.getItem('paris_seen_phrases');
    
    if (savedSeen) {
      try { 
        setSeenPhrases(JSON.parse(savedSeen)); 
      } catch (e) {
        console.error("Error al leer historial de visto", e);
      }
    }

    if (savedDeck) {
      try {
        const parsedDeck = JSON.parse(savedDeck);
        if (parsedDeck.length > 0) {
          setDeck(parsedDeck);
          return;
        }
      } catch (e) {
        console.error("Error al leer mazo guardado", e);
      }
    }

    generar10Tarjetas(CATEGORIES[0]);
  }, []);

  useEffect(() => {
    if (deck.length > 0) {
      localStorage.setItem('paris_deck', JSON.stringify(deck));
    }
  }, [deck]);

  const hablarFrances = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.85;
      const voices = window.speechSynthesis.getVoices();
      const frenchVoice = voices.find(v => v.lang.includes('fr'));
      if (frenchVoice) utterance.voice = frenchVoice;
      window.speechSynthesis.speak(utterance);
    }
  };

  const generar10Tarjetas = async (catTarget) => {
    setLoadingAi(true);
    setSelectedCategory(catTarget);
    resetCardState();

    try {
      const res = await fetch('/api/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          category: catTarget,
          seenPhrases: seenPhrases.slice(-20) 
        })
      });

      const data = await res.json();

      if (data.cards && data.cards.length > 0) {
        const historico = new Set(seenPhrases.map(f => f.toLowerCase().trim()));
        const tarjetasUnicas = data.cards.filter(card => !historico.has(card.fr.toLowerCase().trim()));
        const tarjetasFinales = tarjetasUnicas.length > 0 ? tarjetasUnicas : data.cards;

        setDeck(tarjetasFinales);
        setCurrentIndex(0);

        const nuevasFrases = tarjetasFinales.map(c => c.fr);
        const historialActualizado = Array.from(new Set([...seenPhrases, ...nuevasFrases]));
        
        setSeenPhrases(historialActualizado);
        localStorage.setItem('paris_seen_phrases', JSON.stringify(historialActualizado));
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

    const cleanUser = userAnswer.trim().toLowerCase().replace(/[!?,.]/g, '');
    const cleanCorrect = current.fr.trim().toLowerCase().replace(/[!?,.]/g, '');

    if (cleanUser === cleanCorrect) {
      setExFeedback({ success: true, msg: "¡Excelente! Escritura perfecta ✨" });
    } else {
      setExFeedback({ success: false, msg: `Correcto: "${current.fr}"` });
    }
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("El reconocimiento de voz requiere Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    setSpResult("🎙️ Escuchando...");

    recognition.onresult = (event) => {
      const spoken = event.results[0][0].transcript;
      setSpResult(`Escuchado: "${spoken}"`);
      const target = deck[currentIndex].fr.toLowerCase().replace(/[!?,.]/g, '');
      
      if (spoken.toLowerCase().includes(target.substring(0, 8))) {
        setSpFeedback({ success: true, msg: "¡Pronunciación genial! 🌟" });
      } else {
        setSpFeedback({ success: false, msg: "Repítelo intentando vocalizar más claro." });
      }
    };

    recognition.onerror = () => setSpResult("No se captó el audio.");
    recognition.start();
  };

  const currentCard = deck[currentIndex] || { category: selectedCategory, fr: "Cargando...", es: "Cargando frases..." };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-between p-4 selection:bg-sky-500 selection:text-white">
      
      <div className="w-full max-w-sm flex flex-col gap-4 my-auto">
        
        {/* Header */}
        <header className="text-center flex flex-col items-center gap-1">
          <div className="inline-flex items-center gap-1.5 bg-sky-100 text-sky-800 font-bold px-3 py-1 rounded-full text-xs">
            <span>🇫🇷</span> París A2 • Navidad
          </div>
          <p className="text-xs text-slate-500 font-medium">Práctica en familia con Mai</p>
        </header>

        {/* BOTÓN ROLEPLAY PROMINENTE */}
        <button 
          onClick={() => setIsRoleplayOpen(true)}
          className="w-full bg-green-500 hover:bg-slate-800 active:scale-[0.98] text-white font-bold py-3 px-4 rounded-2xl text-xs shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2 transition">
          <span className="text-sm">💬</span>
          <span>Simulador de Conversación (Roleplay)</span>
        </button>

        {/* Carrusel de Categorías */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 px-1 -mx-1 touch-pan-x">
          {CATEGORIES.map((cat, i) => {
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
              <span className="text-xs font-semibold text-sky-700">Generando 10 frases A2...</span>
            </div>
          )}

          <div className="text-center flex flex-col gap-1.5 my-1">
            <div className="text-xs text-slate-500 font-medium">{currentCard.es}</div>
            <div className="text-lg font-bold text-slate-900 tracking-tight leading-snug">{currentCard.fr}</div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button 
              onClick={() => hablarFrances(currentCard.fr)}
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
          {spFeedback && (
            <div className={`p-2.5 rounded-xl text-xs font-semibold text-center ${spFeedback.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
              {spFeedback.msg}
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
                placeholder="Escribe en francés..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white transition"
              />
              <button 
                onClick={checkAnswer}
                className="bg-slate-800 hover:bg-slate-900 active:scale-[0.97] text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition">
                Validar
              </button>
            </div>

            {exFeedback && (
              <div className={`p-2.5 rounded-xl text-xs font-semibold text-center ${exFeedback.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                {exFeedback.msg}
              </div>
            )}
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
        <span>A2 Français • París Diciembre 2026</span>
        {seenPhrases.length > 0 && (
          <button 
            onClick={() => {
              if (confirm("¿Quieres reiniciar el historial de frases aprendidas?")) {
                setSeenPhrases([]);
                localStorage.removeItem('paris_seen_phrases');
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
      />

    </main>
  );
}