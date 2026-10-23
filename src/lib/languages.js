// Datos compartidos entre cliente y servidor.

// code: ISO 639-1 (Whisper). speech: BCP 47 (voz del navegador).
export const LANGUAGES = {
  fr: { code: "fr", name: "Francés", flag: "🇫🇷", speech: "fr-FR" },
  en: { code: "en", name: "Inglés", flag: "🇬🇧", speech: "en-GB" },
  de: { code: "de", name: "Alemán", flag: "🇩🇪", speech: "de-DE" },
  it: { code: "it", name: "Italiano", flag: "🇮🇹", speech: "it-IT" },
  pt: { code: "pt", name: "Portugués", flag: "🇵🇹", speech: "pt-PT" },
  nl: { code: "nl", name: "Neerlandés", flag: "🇳🇱", speech: "nl-NL" },
  ja: { code: "ja", name: "Japonés", flag: "🇯🇵", speech: "ja-JP" },
  zh: { code: "zh", name: "Chino mandarín", flag: "🇨🇳", speech: "zh-CN" },
  ko: { code: "ko", name: "Coreano", flag: "🇰🇷", speech: "ko-KR" },
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
