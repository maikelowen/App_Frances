import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request) {
  try {
    const { category, seenPhrases = [] } = await request.json();

    const isMix = category?.includes("Mix");
    const topicInstruction = isMix
      ? "Genera 10 tarjetas variadas combinando todas las situaciones del viaje a París (cenas de Navidad, la bebé Mai, restaurante, transporte, presentaciones y vida cotidiana)."
      : `Tema específico: "${category}".`;

    // Pasamos un filtro con las frases recientes para guiar al modelo
    const avoidList = seenPhrases.length > 0 
      ? `EVITA generar frases idénticas o muy parecidas a estas que el usuario ha practicado recientemente: ${JSON.stringify(seenPhrases.slice(-20))}` 
      : "";

    const prompt = `Eres un tutor experto de francés para un estudiante español de nivel A2.
El estudiante viaja en Navidad a París a casa de la familia de su pareja para presentar a su bebé Mai.

Genera ÚNICAMENTE un objeto JSON que contenga un array "cards" con EXACTAMENTE 10 tarjetas de estudio únicas y variadas.
El nivel gramatical y de vocabulario debe ser A2 (pasado compuesto, futuro próximo, cortesía A2, conectores básicos).

${topicInstruction}
${avoidList}

Formato JSON estricto requerido (sin bloques markdown ni texto adicional):
{
  "cards": [
    {
      "category": "${category}",
      "fr": "Frase en francés nivel A2",
      "es": "Traducción exacta al español"
    }
  ]
}`;

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const data = JSON.parse(completion.choices[0].message.content);
    return Response.json(data);

  } catch (error) {
    console.error("Error al generar tarjetas con Groq:", error);
    return Response.json({ error: "Error al generar contenido" }, { status: 500 });
  }
}