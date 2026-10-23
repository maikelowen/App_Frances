import { requireUser } from "@/lib/requireUser";

export async function POST(request) {
  const { unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  try {
    const { text, voiceId = "MmLmgmAm7pKFUJBu1Lov" } = await request.json();

    if (!text) {
      return Response.json({ error: "No se proporcionó texto" }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return Response.json({ error: "Falta la clave ELEVENLABS_API_KEY" }, { status: 500 });
    }

    // Llamada a la API de ElevenLabs (Modelo Multilingual v2)
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.2,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error en ElevenLabs API:", errorText);
      return Response.json({ error: "Error generando audio" }, { status: 500 });
    }

    // Retornamos el stream de audio MP3
    const audioBuffer = await response.arrayBuffer();
    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("Error en endpoint TTS:", error);
    return Response.json({ error: "Error en el servidor de audio" }, { status: 500 });
  }
}