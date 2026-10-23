'use client';

// Pide a la IA 10 frases nuevas de una categoría, evitando las que ya están en el frasebook.
export async function generateCards(category, knownTexts = []) {
  const res = await fetch('/api/generar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category, seenPhrases: knownTexts.slice(-20) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !Array.isArray(data.cards)) throw new Error(data.error || 'No se pudieron generar frases');
  return data.cards;
}
