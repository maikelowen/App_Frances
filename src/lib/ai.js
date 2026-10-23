import Groq from "groq-sdk";

// Cliente y modelo compartidos por todas las rutas que usan IA.
export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// gpt-oss-120b comete menos errores de idioma que el 20b y en Groq es igual de rápido.
export const MODEL = "openai/gpt-oss-120b";
