// Datos compartidos entre cliente y servidor.

// code: ISO 639-1 (Whisper). speech: BCP 47 (voz del navegador).
// romanization: si el idioma no usa nuestro alfabeto, el sistema con el que lo transcribimos.
export const LANGUAGES = {
  fr: { code: "fr", name: "Francés", flag: "🇫🇷", speech: "fr-FR" },
  en: { code: "en", name: "Inglés", flag: "🇬🇧", speech: "en-GB" },
  de: { code: "de", name: "Alemán", flag: "🇩🇪", speech: "de-DE" },
  it: { code: "it", name: "Italiano", flag: "🇮🇹", speech: "it-IT" },
  pt: { code: "pt", name: "Portugués", flag: "🇵🇹", speech: "pt-PT" },
  nl: { code: "nl", name: "Neerlandés", flag: "🇳🇱", speech: "nl-NL" },
  ja: { code: "ja", name: "Japonés", flag: "🇯🇵", speech: "ja-JP", romanization: "romaji (Hepburn)" },
  zh: { code: "zh", name: "Chino mandarín", flag: "🇨🇳", speech: "zh-CN", romanization: "pinyin con tildes de tono" },
  ko: { code: "ko", name: "Coreano", flag: "🇰🇷", speech: "ko-KR", romanization: "romanización revisada del coreano" },
};

export const LEVELS = {
  A1: { label: "A1 · Principiante", description: "Sé muy poco o nada" },
  A2: { label: "A2 · Básico", description: "Me defiendo en situaciones sencillas" },
  B1: { label: "B1 · Intermedio", description: "Mantengo conversaciones cotidianas" },
  B2: { label: "B2 · Intermedio alto", description: "Hablo con soltura de muchos temas" },
  C1: { label: "C1 · Avanzado", description: "Quiero pulir matices y naturalidad" },
};

export const MIX_CATEGORY = "🔀 Mix variado";

export const GOAL_MAX = 300;
export const CONTEXT_MAX = 600;
export const NAME_MAX = 40;
export const RELATION_MAX = 60;
export const MAX_COMPANIONS = 5;

// Minutos al día que el usuario quiere dedicar (define el tamaño de la sesión diaria).
export const DAILY_MINUTES = [5, 10, 15];
