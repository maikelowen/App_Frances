'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LANGUAGES } from '@/lib/languages';
import { addCards, emptyProgress } from '@/lib/progress';

const AppContext = createContext(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return ctx;
}

function load(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Perfil (del servidor) + progreso (del dispositivo) para todas las pantallas de la app.
export default function AppProvider({ userId, firstName, profile, children }) {
  const lang = LANGUAGES[profile.language];
  const name = profile.name || firstName || '';
  // El progreso va por usuario e idioma: cambiar el plan (nombre, objetivo…) no borra el frasebook.
  const storageKey = `tl:${userId}:${profile.language}:progress`;

  const [progress, setProgress] = useState(null);
  const progressRef = useRef(null);

  useEffect(() => {
    let p = load(storageKey);
    if (!p) {
      p = emptyProgress();
      // Aprovechamos las tarjetas que ya se generaron con la versión anterior de la app.
      const oldDeck = load(`tl:${userId}:${profile.updatedAt}:deck`);
      if (Array.isArray(oldDeck)) addCards(p, oldDeck);
    }
    progressRef.current = p;
    setProgress(p);
  }, [storageKey, userId, profile.updatedAt]);

  // Aplica un cambio (función que modifica una copia) y lo guarda.
  const update = useCallback((mutate) => {
    const next = structuredClone(progressRef.current ?? emptyProgress());
    mutate(next);
    progressRef.current = next;
    setProgress(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch (e) {
      console.error('No se pudo guardar el progreso', e);
    }
  }, [storageKey]);

  const value = useMemo(
    () => ({ userId, name, profile, lang, progress, ready: progress !== null, update }),
    [userId, name, profile, lang, progress, update],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
