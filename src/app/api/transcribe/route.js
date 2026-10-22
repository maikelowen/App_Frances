import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request) {
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
      language: "fr",
      response_format: "json",
    });

    return Response.json({ text: transcription.text });
  } catch (error) {
    console.error("Error en transcripción Whisper:", error);
    return Response.json({ error: "Error procesando el audio" }, { status: 500 });
  }
}