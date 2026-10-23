import { requireUser, missingProfile } from "@/lib/requireUser";
import { LANGUAGES } from "@/lib/languages";
import { groq, MODEL } from "@/lib/ai";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
// Por encima de esta probabilidad de "no hay voz", Whisper suele inventarse frases
// (p. ej. "ご視聴ありがとうございました" en japonés con audio en silencio).
const NO_SPEECH_THRESHOLD = 0.6;
// Frases que Whisper "oye" en el silencio (vienen de subtítulos de su entrenamiento).
const HALLUCINATIONS = [
  "ご視聴ありがとうございました", "sous-titrage société radio-canada", "thank you for watching",
  "untertitel im auftrag des zdf", "subtítulos realizados por la comunidad de amara.org", "请不吝点赞 订阅 转发 打赏",
];
const isHallucination = (text) => HALLUCINATIONS.some((h) => text.toLowerCase().includes(h));

export async function POST(request) {
  const { profile, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  if (!profile) return missingProfile();

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return Response.json({ error: "No se proporcionó ningún archivo de audio" }, { status: 400 });
    }
    if (file.size > MAX_AUDIO_BYTES) {
      return Response.json({ error: "El audio es demasiado largo" }, { status: 413 });
    }

    const lang = LANGUAGES[profile.language];

    const transcription = await groq.audio.transcriptions.create({
      file,
      model: "whisper-large-v3",
      language: lang.code,
      response_format: "verbose_json",
      temperature: 0,
    });

    const segments = Array.isArray(transcription.segments) ? transcription.segments : null;
    const text = (segments
      ? segments.filter((s) => (s.no_speech_prob ?? 0) < NO_SPEECH_THRESHOLD).map((s) => s.text).join("")
      : transcription.text ?? ""
    ).trim();
    if (isHallucination(text)) return Response.json({ text: "", romanization: null });

    // En idiomas con otra escritura devolvemos también la romanización, para poder
    // comparar aunque Whisper escriba en kanji lo que la tarjeta tiene en hiragana.
    let romanization = null;
    if (text && lang.romanization) {
      try {
        const completion = await groq.chat.completions.create({
          model: MODEL,
          messages: [{
            role: "user",
            content: `Transcribe este texto en ${lang.name} a ${lang.romanization}. Responde ÚNICAMENTE con un JSON {"romanization": "..."}.\n\nTexto: ${text}`,
          }],
          response_format: { type: "json_object" },
          reasoning_effort: "low",
          max_completion_tokens: 1000,
        });
        romanization = JSON.parse(completion.choices[0].message.content).romanization ?? null;
      } catch (error) {
        console.error("Error romanizando la transcripción:", error?.message ?? error);
      }
    }

    return Response.json({ text, romanization });
  } catch (error) {
    console.error("Error en transcripción Whisper:", error);
    return Response.json({ error: "Error procesando el audio" }, { status: 500 });
  }
}
