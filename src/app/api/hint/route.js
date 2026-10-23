import { requireUser, missingProfile } from "@/lib/requireUser";
import { LANGUAGES } from "@/lib/languages";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const clean = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const cleanPairs = (list, max) =>
  (Array.isArray(list) ? list : [])
    .map((x) => ({ text: clean(x?.text, 200), translation: clean(x?.translation, 200) }))
    .filter((x) => x.text && x.translation)
    .slice(0, max);

// Ayuda para completar una misión del roleplay: vocabulario y expresiones útiles
// según el punto en el que va la conversación.
export async function POST(request) {
  const { profile, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  if (!profile) return missingProfile();

  try {
    const { scenarioIndex = 0, missionIndex = 0, history = [] } = await request.json();

    const scenario = profile.scenarios[Number(scenarioIndex)] ?? profile.scenarios[0];
    const mission = scenario.missions[Number(missionIndex)] ?? scenario.missions[0];
    const lang = LANGUAGES[profile.language];

    const conversation = (Array.isArray(history) ? history : [])
      .slice(-8)
      .map((m) => `${m.sender === "ai" ? "Personaje" : "Estudiante"}: ${String(m.text ?? "").slice(0, 500)}`)
      .join("\n");

    const prompt = `Eres un profesor de ${lang.name} que ayuda a un estudiante hispanohablante de nivel ${profile.level} durante un roleplay.

ESCENA: ${scenario.name}. Habla con: ${scenario.role}
MISIÓN QUE QUIERE CUMPLIR: "${mission}"
CONVERSACIÓN HASTA AHORA:
${conversation || "(todavía no ha empezado)"}

Dale ayuda para cumplir la misión en su próximo mensaje, adecuada al nivel ${profile.level} y a lo último que dijo el personaje.
Responde ÚNICAMENTE con un objeto JSON:
{
  "tip": "Consejo breve en español (1-2 frases) sobre cómo abordar la misión ahora",
  "phrases": [{ "text": "expresión completa en ${lang.name}", "translation": "traducción al español" }],
  "words": [{ "text": "palabra clave en ${lang.name}", "translation": "traducción al español" }]
}
Incluye 3 expresiones distintas (de más sencilla a más elaborada, pero ninguna por encima del nivel ${profile.level}) y entre 3 y 5 palabras clave.
Todo lo que esté en ${lang.name} debe ser gramaticalmente correcto y natural.`;

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 3000,
    });

    const data = JSON.parse(completion.choices[0].message.content);
    return Response.json({
      mission,
      tip: clean(data.tip, 300),
      phrases: cleanPairs(data.phrases, 4),
      words: cleanPairs(data.words, 6),
    });

  } catch (error) {
    console.error("Error generando ayuda del roleplay:", error);
    return Response.json({ error: "No se pudo generar la ayuda" }, { status: 500 });
  }
}
