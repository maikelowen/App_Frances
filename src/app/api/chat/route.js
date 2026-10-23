import { requireUser, missingProfile } from "@/lib/requireUser";
import { LANGUAGES } from "@/lib/languages";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MAX_HISTORY = 20;
const MAX_MESSAGE_LENGTH = 1000;

export async function POST(request) {
  const { user, profile, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  if (!profile) return missingProfile();

  try {
    const { scenarioIndex = 0, history = [], userMessage, currentMissionsState = [false, false, false] } = await request.json();

    const scenario = profile.scenarios[Number(scenarioIndex)] ?? profile.scenarios[0];
    const lang = LANGUAGES[profile.language];
    const done = [0, 1, 2].map((i) => currentMissionsState[i] === true);
    const studentName = user.firstName || "el estudiante";

    const systemPrompt = `Eres el evaluador riguroso y personaje de un simulador de conversación en ${lang.name}, nivel ${profile.level}.

PERSONAJE: ${scenario.role}
ESTUDIANTE: ${studentName}, hispanohablante, nivel ${profile.level} de ${lang.name}.
- Objetivo: ${profile.goal}
- Contexto: ${profile.context || "(sin más contexto)"}

Habla SIEMPRE en ${lang.name}, con frases adecuadas al nivel ${profile.level}. Usa el contexto del estudiante para que la escena sea realista.

CRITERIOS ESTRICTOS DE LAS MISIONES:
1. "${scenario.missions[0]}" -> Estado actual: ${done[0] ? "COMPLETADA" : "PENDIENTE"}
2. "${scenario.missions[1]}" -> Estado actual: ${done[1] ? "COMPLETADA" : "PENDIENTE"}
3. "${scenario.missions[2]}" -> Estado actual: ${done[2] ? "COMPLETADA" : "PENDIENTE"}

REGLAS DE EVALUACIÓN MUY ESTRICTAS:
1. Revisa el último mensaje enviado por el estudiante.
2. SÓLO marca como true una misión PENDIENTE si el estudiante ha expresado la frase o intención solicitada en ${lang.name} comprensible.
3. Si solo ha saludado o dicho algo vago (ej. un simple "hola", "sí", "vale"), NO valides ninguna misión. Sé exigentemente justo.
4. MANTÉN SIEMPRE en true las misiones que ya estuvieran completadas.
5. Calificación (stars):
   - Pon null si aún hay misiones pendientes.
   - Si se completan las 3 misiones, asigna un número de 1 a 5 según la precisión gramatical del estudiante.

FORMATO DE RESPUESTA JSON OBLIGATORIO:
{
  "reply": "Tu respuesta en ${lang.name} continuando el papel",
  "translation": "Traducción exacta al español",
  "completedMissions": [boolean, boolean, boolean],
  "feedback": "Si el estudiante cometió un fallo de expresión o gramática, explícalo brevemente en español. Si no, null.",
  "stars": null o número (1-5),
  "summaryAdvice": "Consejo breve en español solo si se completaron las 3 misiones, de lo contrario null"
}`;

    const formattedHistory = (Array.isArray(history) ? history : [])
      .slice(-MAX_HISTORY)
      .map((msg) => ({
        role: msg.sender === "ai" ? "assistant" : "user",
        content: String(msg.text ?? "").slice(0, MAX_MESSAGE_LENGTH),
      }));

    const messages = [{ role: "system", content: systemPrompt }, ...formattedHistory];

    if (userMessage && userMessage.trim() !== "") {
      messages.push({ role: "user", content: userMessage.slice(0, MAX_MESSAGE_LENGTH) });
    } else {
      messages.push({ role: "user", content: "Salúdame e inicia la escena." });
    }

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages,
      response_format: { type: "json_object" },
    });

    const data = JSON.parse(completion.choices[0].message.content);

    // Fusión segura: nunca desmarcar lo que ya estaba completado
    const completedMissions = done.map((d, i) => d || data.completedMissions?.[i] === true);

    return Response.json({ ...data, completedMissions });

  } catch (error) {
    console.error("Error en la API de Roleplay:", error);
    return Response.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
