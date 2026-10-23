import { requireUser, missingProfile } from "@/lib/requireUser";
import { LANGUAGES, MIX_CATEGORY } from "@/lib/languages";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request) {
  const { profile, unauthorized } = await requireUser();
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
Objetivo del estudiante: ${profile.goal}
Contexto: ${profile.context || "(sin más contexto)"}

Genera ÚNICAMENTE un objeto JSON que contenga un array "cards" con EXACTAMENTE 10 tarjetas de estudio únicas, variadas y útiles para su situación concreta.
El vocabulario y la gramática deben corresponder al nivel ${profile.level}.

${topicInstruction}
${avoidList}

Formato JSON estricto requerido (sin bloques markdown ni texto adicional):
{
  "cards": [
    {
      "text": "Frase en ${lang.name}",
      "translation": "Traducción exacta al español"
    }
  ]
}`;

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const data = JSON.parse(completion.choices[0].message.content);
    const cards = (Array.isArray(data.cards) ? data.cards : [])
      .filter((c) => typeof c?.text === "string" && typeof c?.translation === "string")
      .map((c) => ({ category: cardCategory, text: c.text, translation: c.translation }));

    return Response.json({ cards });

  } catch (error) {
    console.error("Error al generar tarjetas con Groq:", error);
    return Response.json({ error: "Error al generar contenido" }, { status: 500 });
  }
}
