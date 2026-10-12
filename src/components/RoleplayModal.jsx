'use client';

import { useState, useEffect, useRef } from 'react';

const SCENARIOS = [
  "🎄 Cenas y Navidad en familia",
  "🥖 Boulangerie & Cafés de París",
  "👶 Paseando con la bebé Mai",
  "🚇 Moverse por París",
  "👋 Presentaciones con la familia de Bao-Chau"
];

export default function RoleplayModal({ isOpen, onClose }) {
  const [activeScenario, setActiveScenario] = useState(SCENARIOS[0]);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const messagesEndRef = useRef(null);

  // Iniciar la conversación llamando dinámicamente a la IA
  useEffect(() => {
    if (isOpen) {
      iniciarEscenarioIA(activeScenario);
    }
  }, [isOpen, activeScenario]);

  // Scroll automático
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

  const iniciarEscenarioIA = async (scenarioTitle) => {
    setMessages([]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: scenarioTitle,
          history: [],
          userMessage: ""
        })
      });

      const data = await res.json();

      if (data.replyFr) {
        const initialAiMsg = {
          sender: 'ai',
          text: data.replyFr,
          translation: data.translationEs,
          feedback: null
        };
        setMessages([initialAiMsg]);
        hablarFrances(data.replyFr);
      }
    } catch (error) {
      console.error("Error al iniciar escenario con IA:", error);
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
        const aiMsg = {
          sender: 'ai',
          text: data.replyFr,
          translation: data.translationEs,
          feedback: data.feedback
        };
        setMessages((prev) => [...prev, aiMsg]);
        hablarFrances(data.replyFr);
      }
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
    } finally {
      setLoading(false);
    }
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("El reconocimiento por voz requiere Chrome o navegador compatible.");
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-50 w-full max-w-md h-[90vh] sm:h-[650px] sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden border border-slate-200 rounded-t-3xl">
        
        {/* Header Modal */}
        <div className="bg-white px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Simulador de Conversación</h3>
            <p className="text-[10px] text-slate-500">IA Generativa en Vivo • Contexto Familiar</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition font-bold text-sm">
            ✕
          </button>
        </div>

        {/* Selector de Escenarios */}
        <div className="flex gap-2 p-2 bg-white border-b border-slate-100 overflow-x-auto no-scrollbar">
          {SCENARIOS.map((sc, i) => (
            <button
              key={i}
              disabled={loading}
              onClick={() => setActiveScenario(sc)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition ${
                activeScenario === sc
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50'
              }`}>
              {sc}
            </button>
          ))}
        </div>

        {/* Mensajes del Chat */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {messages.map((msg, index) => {
            const isAi = msg.sender === 'ai';
            return (
              <div key={index} className={`flex flex-col ${isAi ? 'items-start' : 'items-end'}`}>
                
                {/* Feedback previo de corrección */}
                {msg.feedback && (
                  <div className="mb-1 text-[11px] bg-amber-50 text-amber-800 border border-amber-200 rounded-xl p-2 max-w-[85%] leading-tight">
                    💡 <strong>Sugerencia:</strong> {msg.feedback}
                  </div>
                )}

                {/* Burbuja de Texto */}
                <div className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed shadow-sm relative group ${
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
              <span className="animate-pulse">La IA está pensando la respuesta...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Campo de Entrada e Interacción */}
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
            placeholder={listening ? "Escuchando en francés..." : "Responde en francés..."}
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