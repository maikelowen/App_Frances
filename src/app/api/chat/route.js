import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const OPEN_SCENARIOS = {
  "🎄 Cenas y Navidad en familia": {
    theme: "Encuentro navideño o reunión familiar en París con la familia de Bao-Chau.",
    guidance: "Sé un familiar cercano o amigo en un ambiente festivo. Habla de la cena, el viaje o la bebé Mai."
  },
  "🥖 Boulangerie & Cafés de París": {
    theme: "Interacción en un establecimiento de comida, cafetería o comercio parisino.",
    guidance: "Sé el camarero, vendedor o un cliente. Inicia la interacción de forma natural y ofrece opciones."
  },
  "👶 Paseando con la bebé Mai": {
    theme: "Situación al aire libre, parque, tienda o paseo por París llevando a la bebé Mai.",
    guidance: "Sé un transeúnte, otro padre/madre en el parque o un vecino. Comenta sobre Mai, el clima o París."
  },
  "🚇 Moverse por París": {
    theme: "Desplazamientos, transporte público, taxis o caminar por las calles de París.",
    guidance: "Sé un parisino local o trabajador del transporte. Ayuda con direcciones, billetes o el carrito."
  },
  "👋 Presentaciones con la familia de Bao-Chau": {
    theme: "Conocer o interactuar con tíos, primos o amigos de Bao-Chau.",
    guidance: "Sé un familiar de Bao-Chau. Muestra hospitalidad y haz preguntas sobre la estancia o la familia."
  }
};

export async function POST(request) {
  try {
    const { scenario, history = [], userMessage } = await request.json();

    const currentScenario = OPEN_SCENARIOS[scenario] || {
      theme: "Conversación cotidiana en París.",
      guidance: "Sé un parisino amable y abierto a cualquier tema A2."
    };

    const systemPrompt = `Eres un interlocutor francés amable que ayuda a Miguel a practicar su francés A2 en situaciones reales.

CONTEXTO:
- Escenario: ${currentScenario.theme}
- Orientación: ${currentScenario.guidance}
- Usuario: Miguel (estudiante A2). Viaja a París en Navidad con Bao-Chau y su bebé Mai.

REGLAS OBLIGATORIAS DE INTERACCIÓN:
1. Mantén la respuesta corta y accesible en francés A2 (2 o 3 frases como máximo).
2. OBLIGATORIO: Termina SIEMPRE tu mensaje con una pregunta interesante o una propuesta concreta para motivar a Miguel a responder y mantener la conversación fluida.
3. Reacciona con empatía a lo que te diga Miguel antes de hacer tu siguiente pregunta.
4. Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura:
{
  "replyFr": "Tu frase en francés terminada SIEMPRE en una pregunta",
  "translationEs": "Traducción natural al español de todo tu mensaje",
  "feedback": "Si Miguel cometió un fallo gramatical o de expresión en su mensaje anterior, indícalo brevemente en español. Si es correcto o es el inicio de la escena, pon null."
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
        content: "Salúdame, preséntate brevemente dentro del contexto y hazme una primera pregunta para empezar a hablar."
      });
    }

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages,
      response_format: { type: "json_object" },
    });

    const data = JSON.parse(completion.choices[0].message.content);
    return Response.json(data);

  } catch (error) {
    console.error("Error en el chat de roleplay:", error);
    return Response.json({ error: "Error procesando el chat" }, { status: 500 });
  }
}