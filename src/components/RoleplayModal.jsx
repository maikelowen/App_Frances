'use client';

import { useState, useEffect, useRef } from 'react';

const SCENARIO_NAMES = [
  "🥖 Boulangerie & Cafés",
  "🎄 Cenas y Navidad",
  "👶 En el parque con Mai",
  "🚇 Metro y Transporte"
];

export default function RoleplayModal({ isOpen, onClose }) {
  const [activeScenario, setActiveScenario] = useState(SCENARIO_NAMES[0]);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  
  // Estado de Misiones y Gamificación
  const [missions, setMissions] = useState([]);
  const [completedMissions, setCompletedMissions] = useState([false, false, false]);
  const [showSummary, setShowSummary] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      iniciarEscenario(activeScenario);
    }
  }, [isOpen, activeScenario]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const hablarFrances = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const iniciarEscenario = async (scenarioName) => {
    setMessages([]);
    setLoading(true);
    setShowSummary(false);
    setCompletedMissions([false, false, false]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: scenarioName, history: [], userMessage: "" })
      });

      const data = await res.json();

      if (data.replyFr) {
        setMissions(data.missionsList || []);
        if (data.completedMissions) setCompletedMissions(data.completedMissions);

        const initialMsg = {
          sender: 'ai',
          text: data.replyFr,
          translation: data.translationEs,
          feedback: null
        };
        setMessages([initialMsg]);
        hablarFrances(data.replyFr);
      }
    } catch (err) {
      console.error("Error al iniciar escenario:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (customText = null) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || loading) return;

    const userMsg = { sender: 'user', text: textToSend };
    const newHistory = [...messages, userMsg];

    setMessages(newHistory);
    setInputMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: activeScenario,
          history: newHistory,
          userMessage: textToSend
        })
      });

      const data = await res.json();

      if (data.replyFr) {
        if (data.completedMissions) setCompletedMissions(data.completedMissions);

        const aiMsg = {
          sender: 'ai',
          text: data.replyFr,
          translation: data.translationEs,
          feedback: data.feedback
        };
        setMessages((prev) => [...prev, aiMsg]);
        hablarFrances(data.replyFr);
      }
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
    } finally {
      setLoading(false);
    }
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta reconocimiento de voz nativo.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    setListening(true);

    recognition.onresult = (event) => {
      const spokenText = event.results[0][0].transcript;
      setListening(false);
      handleSendMessage(spokenText);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  const totalCompleted = completedMissions.filter(Boolean).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-50 w-full max-w-md h-[92vh] sm:h-[680px] sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden border border-slate-200 rounded-t-3xl">
        
        {/* Header Modal */}
        <div className="bg-white px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Roleplay de Inmersión A2</h3>
            <p className="text-[10px] font-semibold text-sky-600">Misiones Activas: {totalCompleted} / 3 completadas</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition font-bold text-sm">
            ✕
          </button>
        </div>

        {/* Selector de Escenarios */}
        <div className="flex gap-2 p-2 bg-slate-100 border-b border-slate-200 overflow-x-auto no-scrollbar">
          {SCENARIO_NAMES.map((sc, i) => (
            <button
              key={i}
              disabled={loading}
              onClick={() => setActiveScenario(sc)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition ${
                activeScenario === sc
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}>
              {sc}
            </button>
          ))}
        </div>

        {/* TARJETA DE MISIONES (Gamificación) */}
        <div className="bg-sky-50 border-b border-sky-100 p-3">
          <div className="text-[11px] font-bold text-sky-900 mb-1 flex items-center gap-1">
            <span>🎯</span> Misiones del escenario:
          </div>
          <div className="flex flex-col gap-1">
            {missions.map((m, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[11px]">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                  completedMissions[idx] ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {completedMissions[idx] ? '✓' : idx + 1}
                </span>
                <span className={completedMissions[idx] ? 'line-through text-slate-400 font-medium' : 'text-slate-700 font-medium'}>
                  {m}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Chat / Historial */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {messages.map((msg, index) => {
            const isAi = msg.sender === 'ai';
            return (
              <div key={index} className={`flex flex-col ${isAi ? 'items-start' : 'items-end'}`}>
                
                {msg.feedback && (
                  <div className="mb-1 text-[11px] bg-amber-50 text-amber-900 border border-amber-200 rounded-xl p-2 max-w-[85%] leading-tight">
                    💡 <strong>Sugerencia:</strong> {msg.feedback}
                  </div>
                )}

                <div className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed shadow-sm relative ${
                  isAi 
                    ? 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none' 
                    : 'bg-sky-600 text-white rounded-tr-none'
                }`}>
                  <p className="font-medium">{msg.text}</p>
                  
                  {isAi && msg.translation && (
                    <div className="mt-1.5 pt-1.5 border-t border-slate-100 text-[10px] text-slate-400">
                      {msg.translation}
                    </div>
                  )}

                  {isAi && (
                    <button 
                      onClick={() => hablarFrances(msg.text)}
                      className="absolute -right-7 top-1.5 text-xs p-1 opacity-70 hover:opacity-100">
                      🔊
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-2 text-slate-400 text-xs italic bg-white p-2.5 rounded-2xl border border-slate-200/80 w-fit">
              <span className="animate-pulse">La IA está evaluando tu respuesta y misiones...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          <button 
            onClick={startListening}
            disabled={loading}
            className={`p-3 rounded-xl transition ${
              listening 
                ? 'bg-rose-500 text-white animate-bounce' 
                : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 disabled:opacity-50'
            }`}>
            🎙️
          </button>

          <input 
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={loading}
            placeholder={listening ? "Escuchando..." : "Responde en francés..."}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-sky-500 focus:bg-white transition disabled:opacity-50"
          />

          <button 
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || loading}
            className="bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition">
            Enviar
          </button>
        </div>

      </div>
    </div>
  );
}