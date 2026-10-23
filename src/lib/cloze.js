// Ejercicio de "rellenar el hueco": una palabra de la frase se oculta y el usuario la escribe.

const CHARACTER_LANGUAGES = new Set(["ja", "zh"]);
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalize = (s) => String(s ?? "").normalize("NFKC").trim().toLowerCase().replace(/[.,;:!?¡¿"'’«»。、！？]/g, "");
const stripAccents = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC");

// Parte la frase alrededor de la palabra: { before, answer, after } o null si no aparece.
// En idiomas con espacios exige que sea una palabra completa (que "le" no case dentro de "lent").
export function splitAround(text, word, language) {
  if (!text || !word) return null;
  const source = CHARACTER_LANGUAGES.has(language)
    ? escapeRegExp(word)
    : `(?<![\\p{L}\\p{N}])${escapeRegExp(word)}(?![\\p{L}\\p{N}])`;
  const match = new RegExp(source, "iu").exec(text);
  if (!match) return null;
  return {
    before: text.slice(0, match.index),
    answer: match[0],
    after: text.slice(match.index + match[0].length),
  };
}

// Para tarjetas sin datos de gramática (generadas antes): elegimos la palabra más larga.
export function fallbackGrammar(text, language, firstName) {
  if (CHARACTER_LANGUAGES.has(language)) return null;
  const skip = normalize(firstName);
  const words = [...String(text).matchAll(/[\p{L}\p{M}]+/gu)]
    .map((m) => m[0])
    .filter((w, i) => w.length >= 3 && normalize(w) !== skip && !(i > 0 && /^\p{Lu}/u.test(w)));
  if (words.length === 0) return null;
  const word = words.reduce((a, b) => (b.length > a.length ? b : a));
  return { word, hint: `Palabra de ${word.length} letras que empieza por "${word[0].toLowerCase()}"`, explanation: "" };
}

// tone: 'ok' | 'almost' (solo fallan acentos/tonos) | 'bad'
export function checkWord(input, answers, { accentsOptional = false } = {}) {
  const attempt = normalize(input);
  if (!attempt) return null;
  const targets = answers.filter(Boolean).map(normalize);
  if (targets.includes(attempt)) return "ok";
  if (targets.some((t) => stripAccents(t) === stripAccents(attempt))) return accentsOptional ? "ok" : "almost";
  return "bad";
}
