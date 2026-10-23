import { requireUser } from "@/lib/requireUser";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request) {
  const { profile, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return Response.json({ error: "No se proporcionó ningún archivo de audio" }, { status: 400 });
    }

    // Transcripción ultrarrápida usando Groq Whisper
    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: "whisper-large-v3",
      language: profile?.language, // idioma del plan del usuario (Whisper lo detecta si falta)
      response_format: "json",
    });

    return Response.json({ text: transcription.text });
  } catch (error) {
    console.error("Error en transcripción Whisper:", error);
    return Response.json({ error: "Error procesando el audio" }, { status: 500 });
  }
}