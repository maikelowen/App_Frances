import { requireUser, missingProfile } from "@/lib/requireUser";
import { LANGUAGES } from "@/lib/languages";
import { groq, MODEL } from "@/lib/ai";
import { noPlaceholdersRule, studentBlock } from "@/lib/prompting";

const MAX_HISTORY = 20;
const MAX_MESSAGE_LENGTH = 1000;

export async function POST(request) {
  const { user, profile, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  if (!profile) return missingProfile();

  try {
    const { scenarioIndex = 0, history = [], userMessage, currentMissionsState = [false, false, false], twist = false } = await request.json();

    const scenario = profile.scenarios[Number(scenarioIndex)] ?? profile.scenarios[0];
    const lang = LANGUAGES[profile.language];
    const done = [0, 1, 2].map((i) => currentMissionsState[i] === true);
    const pending = scenario.missions.map((m, i) => ({ m, i })).filter(({ i }) => !done[i]);

    // Orden de los campos del JSON: primero la evaluación y después la respuesta, para que
    // el personaje sepa qué misión queda pendiente antes de escribir.
    const systemPrompt = `Eres a la vez el personaje y el evaluador de un simulador de conversación en ${lang.name}, nivel ${profile.level}.

PERSONAJE: ${scenario.role}
ESCENA: ${scenario.name}

ESTUDIANTE (hispanohablante, nivel ${profile.level} de ${lang.name}):
${studentBlock(profile, user.firstName)}

MISIONES DEL ESTUDIANTE (cosas que ÉL debe decir o preguntar):
${scenario.missions.map((m, i) => `${i + 1}. "${m}" -> ${done[i] ? "COMPLETADA" : "PENDIENTE"}`).join("\n")}

PASO 1 · EVALÚA el último mensaje del estudiante:
- Marca como true una misión PENDIENTE solo si el estudiante ha expresado esa intención en ${lang.name} comprensible.
- Las frases de ejemplo entre paréntesis son orientativas: vale cualquier forma correcta de expresar esa intención (p. ej. "Merci, au revoir" cumple "despedirte con cortesía").
- Un saludo o una respuesta vaga ("sí", "vale", "hola") NO cumple ninguna misión. Sé justo pero exigente.
- Mantén en true las misiones que ya estaban completadas.

PASO 2 · RESPONDE como el personaje, dirigiendo la escena:
- Eres un compañero de escena, no un narrador. Responde con 1-3 frases cortas, naturales y adecuadas al nivel ${profile.level}.
- Reacciona a lo que ha dicho el estudiante y dale vida al personaje (emociones, detalles del lugar).
- Usa el nombre del estudiante y de sus acompañantes solo si tu personaje los conocería (p. ej. un familiar) o ya han salido en la conversación. Un desconocido no sabe cómo se llama.
- Busca la PRIMERA misión que siga pendiente tras tu evaluación y crea la ocasión para que el estudiante la cumpla: termina casi siempre con una pregunta o una situación que le invite a hacerlo.
- Crea esa ocasión de forma sutil, como pasaría en la vida real, sin decir ni insinuar literalmente lo que tiene que decir. Ejemplo: para que pregunte el precio, NO preguntes "¿quiere saber el precio?"; di algo como "Y con esto, ¿algo más?" o "¿Se lo envuelvo?".
- NUNCA hagas tú lo que pide una misión pendiente ni des la información que el estudiante tiene que pedir. Ejemplo: si su misión es preguntar el precio, no lo digas; pon el producto en el mostrador y pregunta "¿Algo más?" para que sea él quien lo pregunte.
- Si el estudiante parece bloqueado o responde muy poco, simplifica: haz una pregunta más fácil o da una pista sin salir del personaje.
- Sigue la corriente al estudiante: si quiere avanzar o despedirse, déjale. No insistas ni le retengas para forzar una misión.
- Si ya están las 3 misiones completadas, cierra la escena de forma natural y amable.
- Habla SIEMPRE en ${lang.name}.${twist ? `
- VARIANTE CON GIRO: el estudiante ya conoce esta escena. Introduce desde el principio una complicación realista y coherente (algo agotado, un malentendido, un cambio de planes, una pregunta inesperada) que le obligue a adaptarse. Las misiones deben seguir siendo posibles.` : ""}
${noPlaceholdersRule(profile, user.firstName)}${lang.romanization ? `
El estudiante puede escribir en ${lang.name} o en ${lang.romanization}: ambas formas son válidas para las misiones.` : ""}

FORMATO DE RESPUESTA JSON OBLIGATORIO (en este orden):
{
  "completedMissions": [boolean, boolean, boolean],
  "feedback": "Si el estudiante cometió un fallo de expresión o gramática, explícalo brevemente en español. Si no, null.",
  "correction": "Si hubo fallo: { \"text\": \"su frase corregida en ${lang.name}\",${lang.romanization ? ` \"romanization\": \"en ${lang.romanization}\",` : ""} \"translation\": \"en español\" }. Si no, null.",
  "reply": "Tu respuesta como personaje en ${lang.name}",
${lang.romanization ? `  "romanization": "Tu respuesta transcrita en ${lang.romanization}",
` : ""}  "translation": "Traducción exacta al español",
  "stars": null mientras queden misiones pendientes; si están las 3, un número de 1 a 5 según la precisión gramatical del estudiante,
  "summaryAdvice": "Consejo breve en español solo si se completaron las 3 misiones, si no null"
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
      messages.push({
        role: "user",
        content: `(Inicio de la escena: el estudiante aún no ha hablado. Salúdale y abre la conversación de forma que le invite a cumplir la misión: "${pending[0]?.m ?? scenario.missions[0]}".)`,
      });
    }

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages,
      response_format: { type: "json_object" },
    });

    const data = JSON.parse(completion.choices[0].message.content);

    // Fusión segura: nunca desmarcar lo que ya estaba completado
    const completedMissions = done.map((d, i) => d || data.completedMissions?.[i] === true);

    // Corrección como tarjeta para el frasebook (solo si viene completa).
    const c = data.correction;
    const correction = c && typeof c === "object" && typeof c.text === "string" && typeof c.translation === "string"
      ? { text: c.text.slice(0, 300), translation: c.translation.slice(0, 300), ...(lang.romanization && typeof c.romanization === "string" ? { romanization: c.romanization.slice(0, 300) } : {}) }
      : null;

    return Response.json({ ...data, correction, completedMissions });

  } catch (error) {
    console.error("Error en la API de Roleplay:", error);
    return Response.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
