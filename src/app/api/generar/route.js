import { requireUser, missingProfile } from "@/lib/requireUser";
import { LANGUAGES, MIX_CATEGORY } from "@/lib/languages";
import { groq, MODEL } from "@/lib/ai";
import { noPlaceholdersRule, romanizationRule, studentBlock } from "@/lib/prompting";

const clean = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// La palabra del ejercicio de gramática tiene que aparecer tal cual en la frase; si no, se descarta
// (el cliente elegirá una palabra por su cuenta).
function sanitizeGrammar(grammar, text) {
  const word = clean(grammar?.word, 60);
  if (!word || !new RegExp(escapeRegExp(word), "iu").test(text)) return null;
  return {
    word,
    ...(clean(grammar?.wordRomanization, 60) ? { wordRomanization: clean(grammar.wordRomanization, 60) } : {}),
    hint: clean(grammar?.hint, 160),
    explanation: clean(grammar?.explanation, 300),
  };
}

export async function POST(request) {
  const { user, profile, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  if (!profile) return missingProfile();

  try {
    const { category, seenPhrases = [] } = await request.json();

    const lang = LANGUAGES[profile.language];
    // Solo aceptamos categorías del plan del usuario; cualquier otra cosa se trata como mix.
    const isMix = category === MIX_CATEGORY || !profile.categories.includes(category);
    const cardCategory = isMix ? MIX_CATEGORY : category;

    const topicInstruction = isMix
      ? `Genera 10 tarjetas variadas que combinen todas estas situaciones: ${profile.categories.join(", ")}.`
      : `Tema específico: "${category}".`;

    // Pasamos las frases recientes para que el modelo no las repita
    const recent = Array.isArray(seenPhrases) ? seenPhrases.slice(-20).map((p) => String(p).slice(0, 200)) : [];
    const avoidList = recent.length > 0
      ? `EVITA generar frases idénticas o muy parecidas a estas que el estudiante ha practicado recientemente: ${JSON.stringify(recent)}`
      : "";

    const prompt = `Eres un tutor experto de ${lang.name} para un estudiante hispanohablante de nivel ${profile.level}.
ESTUDIANTE:
${studentBlock(profile, user.firstName)}

Genera ÚNICAMENTE un objeto JSON que contenga un array "cards" con EXACTAMENTE 10 tarjetas de estudio únicas, variadas y útiles para su situación concreta.
El vocabulario y la gramática deben corresponder al nivel ${profile.level}.

${topicInstruction}
${avoidList}

${noPlaceholdersRule(profile, user.firstName)}
${romanizationRule(lang)}

Formato JSON estricto requerido (sin bloques markdown ni texto adicional):
{
  "cards": [
    {
      "text": "Frase en ${lang.name}",${lang.romanization ? `
      "romanization": "Transcripción en ${lang.romanization}",` : ""}
      "translation": "Traducción exacta al español",
      "grammar": {
        "word": "UNA palabra copiada EXACTAMENTE de la frase, buena para practicar gramática de nivel ${profile.level} (verbo conjugado, artículo, preposición, pronombre, concordancia…). Nunca un nombre propio.",${lang.romanization ? `
        "wordRomanization": "esa misma palabra tal como aparece en la romanización",` : ""}
        "hint": "Pista breve en español que NO revele la palabra (ej. 'verbo vouloir · condicional · je')",
        "explanation": "Explicación breve en español de por qué se usa esa forma"
      }
    }
  ]
}`;

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const data = JSON.parse(completion.choices[0].message.content);
    const cards = (Array.isArray(data.cards) ? data.cards : [])
      .filter((c) => typeof c?.text === "string" && typeof c?.translation === "string")
      .map((c) => ({
        category: cardCategory,
        text: c.text,
        translation: c.translation,
        ...(lang.romanization && typeof c.romanization === "string" ? { romanization: c.romanization } : {}),
        grammar: sanitizeGrammar(c.grammar, c.text),
      }));

    return Response.json({ cards });

  } catch (error) {
    console.error("Error al generar tarjetas con Groq:", error);
    return Response.json({ error: "Error al generar contenido" }, { status: 500 });
  }
}
