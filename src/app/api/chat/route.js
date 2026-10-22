import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SCENARIOS_WITH_MISSIONS = {
  "🥖 Boulangerie & Cafés": {
    role: "Un panadero o camarero parisino amable pero con prisa.",
    missions: [
      "Pedir expresamente al menos 2 productos en francés (ej. 'Je voudrais dos croissants et un café').",
      "Preguntar el precio o si aceptan tarjeta (ej. 'C'est combien ?' o 'Vous acceptez la carte ?').",
      "Despedirse usando cortesía explícita (ej. 'Merci beaucoup, bonne journée !')."
    ]
  },
  "🎄 Cenas y Navidad": {
    role: "Un familiar parisino cercano en la cena de Nochebuena.",
    missions: [
      "Mencionar explícitamente el viaje desde España o la llegada a París.",
      "Mencionar o responder activamente sobre la bebé Mai o Bao-Chau.",
      "Proponer o responder a un brindis de Navidad (ej. 'Santé !' o 'Joyeux Noël !')."
    ]
  },
  "👶 En el parque con Mai": {
    role: "Un vecino o padre/madre parisino en el Jardin du Luxembourg.",
    missions: [
      "Decir el nombre 'Mai' y mencionar cuántos meses o edad tiene.",
      "Comentar algo sobre el clima o el día en París (ej. 'Il fait beau', 'Il fait froid').",
      "Pedir una recomendación de un sitio cercano para pasear o tomar algo."
    ]
  },
  "🚇 Metro y Transporte": {
    role: "Un empleado de la estación de metro o un parisino local.",
    missions: [
      "Preguntar por una línea o dirección a un sitio específico.",
      "Preguntar sobre el cochecito de bebé o ascensor (ej. 'poussette', 'ascenseur').",
      "Preguntar por el precio o compra de billetes ('ticket', 'pass')."
    ]
  }
};

export async function POST(request) {
  try {
    const { scenario, history = [], userMessage, currentMissionsState = [false, false, false] } = await request.json();

    const scenarioData = SCENARIOS_WITH_MISSIONS[scenario] || {
      role: "Un ciudadano parisino.",
      missions: [
        "Presentarte en francés.",
        "Responder a las preguntas.",
        "Despedirte amablemente."
      ]
    };

    const systemPrompt = `Eres el evaluador riguroso y personaje de un simulador de francés A2.

PERSONAJE: ${scenarioData.role}
USUARIO: Miguel (estudiante español A2). Viaja a París en Navidad con Bao-Chau y su bebé Mai.

CRITERIOS ESTRICTOS DE LAS MISIONES:
1. "${scenarioData.missions[0]}" -> Estado actual: ${currentMissionsState[0] ? "COMPLETADA" : "PENDIENTE"}
2. "${scenarioData.missions[1]}" -> Estado actual: ${currentMissionsState[1] ? "COMPLETADA" : "PENDIENTE"}
3. "${scenarioData.missions[2]}" -> Estado actual: ${currentMissionsState[2] ? "COMPLETADA" : "PENDIENTE"}

REGLAS DE EVALUACIÓN MUY ESTRICTAS:
1. Revisa el último mensaje enviado por Miguel.
2. SÓLO marca como true una misión PENDIENTE si Miguel ha dicho la frase o intención EXACTA solicitada en francés A2 comprensible.
3. Si solo ha saludado o dicho algo vago (ej. "Bonjour", "Oui", "D'accord"), NO valides ninguna misión. Sé exigentemente justo.
4. MANTÉN SIEMPRE en true las misiones que ya estuvieran completadas.
5. Calificación (stars): 
   - Pon null si aún hay misiones pendientes.
   - Si se completan las 3 misiones, asigna un número de 1 a 5 según la precisión gramatical de Miguel en sus mensajes.

FORMATO DE RESPUESTA JSON OBLIGATORIO:
{
  "replyFr": "Tu respuesta en francés continuando el papel",
  "translationEs": "Traducción exacta al español",
  "completedMissions": [boolean, boolean, boolean],
  "feedback": "Si Miguel cometió un fallo de expresión o gramática, indícalo brevemente. Si no, null.",
  "stars": null o número (1-5),
  "summaryAdvice": "Consejo breve solo si se completaron las 3 misiones, de lo contrario null"
}`;

    const formattedHistory = history.map((msg) => ({
      role: msg.sender === "ai" ? "assistant" : "user",
      content: msg.text,
    }));

    const messages = [
      { role: "system", content: systemPrompt },
      ...formattedHistory,
    ];

    if (userMessage && userMessage.trim() !== "") {
      messages.push({ role: "user", content: userMessage });
    } else {
      messages.push({
        role: "user",
        content: "Salúdame e inicia la escena."
      });
    }

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages,
      response_format: { type: "json_object" },
    });

    const data = JSON.parse(completion.choices[0].message.content);

    // Fusión segura: nunca desmarcar lo que ya estaba completado
    const mergedMissions = [
      currentMissionsState[0] || (data.completedMissions ? data.completedMissions[0] : false),
      currentMissionsState[1] || (data.completedMissions ? data.completedMissions[1] : false),
      currentMissionsState[2] || (data.completedMissions ? data.completedMissions[2] : false),
    ];

    return Response.json({
      ...data,
      completedMissions: mergedMissions,
      missionsList: scenarioData.missions
    });

  } catch (error) {
    console.error("Error en la API de Roleplay:", error);
    return Response.json({ error: "Error en el servidor" }, { status: 500 });
  }
}