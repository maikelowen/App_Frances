import { GoogleGenAI } from "@google/genai";
import { requireUser } from "@/lib/requireUser";

// Voz con Gemini (capa gratuita de Google AI Studio). Si falla o se agota el cupo,
// el navegador usa su propia voz como alternativa (ver src/lib/speech.js).
const MODEL = "gemini-3.8-flash-tts";
const VOICE = "Kore";
const MAX_TEXT_LENGTH = 500;

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

// Algunos modelos devuelven PCM crudo (audio/L16): le ponemos cabecera WAV para que el navegador lo reproduzca.
function pcmToWav(pcm, sampleRate = 24000) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);              // PCM
  header.writeUInt16LE(1, 22);              // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28); // bytes por segundo (16 bits)
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

export async function POST(request) {
  const { unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  if (!ai) return Response.json({ error: "Voz no configurada" }, { status: 501 });

  try {
    const { text } = await request.json();
    if (typeof text !== "string" || !text.trim()) {
      return Response.json({ error: "No se proporcionó texto" }, { status: 400 });
    }

    // Solo el texto: si se añaden instrucciones de estilo, el modelo también las lee en voz alta.
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [{ parts: [{ text: text.trim().slice(0, MAX_TEXT_LENGTH) }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
      },
    });

    const audio = result.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
    if (!audio?.data) throw new Error("Respuesta sin audio");

    const bytes = Buffer.from(audio.data, "base64");
    const mime = (audio.mimeType || "").toLowerCase();
    const rate = Number(mime.match(/rate=(\d+)/)?.[1]) || 24000;
    const wav = mime.includes("wav") ? bytes : pcmToWav(bytes, rate);

    return new Response(wav, {
      headers: { "Content-Type": "audio/wav", "Cache-Control": "private, max-age=31536000, immutable" },
    });
  } catch (error) {
    const status = error?.status === 429 ? 429 : 502;
    console.error("Error en la voz de Gemini:", error?.message ?? error);
    return Response.json({ error: status === 429 ? "Cupo de voz agotado" : "Error generando audio" }, { status });
  }
}
