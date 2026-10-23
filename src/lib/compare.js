// Comparación palabra a palabra entre la frase objetivo y lo que escribió/dijo el usuario.

// Idiomas sin espacios entre palabras: comparamos carácter a carácter.
const CHARACTER_LANGUAGES = new Set(["ja", "zh"]);
// En estos, quitar "acentos" rompería la escritura (p. ej. el dakuten japonés o el hangul).
const NO_ACCENT_STRIP = new Set(["ja", "zh", "ko"]);

const WORD = /[\p{L}\p{N}\p{M}]+/gu;
const CHAR = /[\p{L}\p{N}][\p{M}]*/gu;

function normalizeWord(word, language, ignoreAccents) {
  let s = word.normalize("NFKC").toLowerCase();
  if (ignoreAccents && !NO_ACCENT_STRIP.has(language)) {
    s = s.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC");
  }
  return s;
}

// Alineación por subsecuencia común más larga: qué palabras del objetivo aparecen, en orden.
function align(target, attempt) {
  const dp = Array.from({ length: target.length + 1 }, () => new Array(attempt.length + 1).fill(0));
  for (let i = target.length - 1; i >= 0; i--) {
    for (let j = attempt.length - 1; j >= 0; j--) {
      dp[i][j] = target[i] === attempt[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const matched = new Array(target.length).fill(false);
  let i = 0, j = 0;
  while (i < target.length && j < attempt.length) {
    if (target[i] === attempt[j]) { matched[i] = true; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return matched;
}

// Devuelve la frase original troceada en segmentos (palabras marcadas ok/fallo y, entre
// medias, espacios y signos tal cual) más estadísticas de acierto.
export function compareSentence(targetText, attemptText, language, { ignoreAccents = false } = {}) {
  const pattern = CHARACTER_LANGUAGES.has(language) ? CHAR : WORD;
  const target = String(targetText ?? "");

  const targetMatches = [...target.matchAll(pattern)];
  const targetWords = targetMatches.map((m) => normalizeWord(m[0], language, ignoreAccents));
  const attemptWords = [...String(attemptText ?? "").matchAll(pattern)].map((m) => normalizeWord(m[0], language, ignoreAccents));
  const matched = align(targetWords, attemptWords);

  const segments = [];
  let cursor = 0;
  targetMatches.forEach((m, i) => {
    if (m.index > cursor) segments.push({ text: target.slice(cursor, m.index), ok: null });
    segments.push({ text: m[0], ok: matched[i] });
    cursor = m.index + m[0].length;
  });
  if (cursor < target.length) segments.push({ text: target.slice(cursor), ok: null });

  const hits = matched.filter(Boolean).length;
  return {
    segments,
    allMatched: targetWords.length > 0 && hits === targetWords.length,
    extraWords: attemptWords.length - hits,
    score: targetWords.length ? hits / targetWords.length : 0,
  };
}
