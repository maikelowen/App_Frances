import Groq from "groq-sdk";
import { LANGUAGES } from "./languages";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const CATEGORY_COUNT = 6;
const SCENARIO_COUNT = 4;

const FALLBACK_CATEGORIES = [
  "👋 Presentaciones",
  "🍽️ Comida y restaurantes",
  "🛍️ Compras",
  "🚇 Transporte",
  "🗣️ Conversación cotidiana",
  "🆘 Imprevistos",
];

const FALLBACK_SCENARIOS = [
  {
    name: "☕ En una cafetería",
    role: "Un camarero amable pero con prisa.",
    missions: ["Pedir una bebida y algo de comer.", "Preguntar el precio.", "Despedirte con cortesía."],
  },
  {
    name: "🚇 Pidiendo indicaciones",
    role: "Un vecino de la ciudad que pasea por la calle.",
    missions: ["Preguntar cómo llegar a un sitio.", "Pedir que repita más despacio.", "Dar las gracias."],
  },
  {
    name: "👋 Conociendo a alguien",
    role: "Una persona simpática que acabas de conocer.",
    missions: ["Presentarte y decir de dónde eres.", "Preguntarle a qué se dedica.", "Proponer volver a quedar."],
  },
  {
    name: "🛍️ De compras",
    role: "Un dependiente de una tienda.",
    missions: ["Preguntar si tienen un producto.", "Preguntar si puedes pagar con tarjeta.", "Despedirte con cortesía."],
  },
];

const clean = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");

function sanitizePlan(data) {
  const categories = (Array.isArray(data?.categories) ? data.categories : [])
    .map((c) => clean(c, 40))
    .filter(Boolean)
    .slice(0, CATEGORY_COUNT);

  const scenarios = (Array.isArray(data?.scenarios) ? data.scenarios : [])
    .map((s) => ({
      name: clean(s?.name, 40),
      role: clean(s?.role, 200),
      missions: (Array.isArray(s?.missions) ? s.missions : []).map((m) => clean(m, 200)).filter(Boolean).slice(0, 3),
    }))
    .filter((s) => s.name && s.role && s.missions.length === 3)
    .slice(0, SCENARIO_COUNT);

  return { categories, scenarios };
}

// Genera las categorías de tarjetas y los escenarios de roleplay a partir del perfil.
// Si la IA falla, devuelve un plan genérico para que el onboarding nunca se bloquee.
export async function generatePlan({ language, level, goal, context }) {
  const lang = LANGUAGES[language];

  const prompt = `Eres un diseñador de cursos de idiomas. Crea un plan de práctica personalizado.

ESTUDIANTE (hispanohablante):
- Idioma que aprende: ${lang.name}
- Nivel: ${level}
- Objetivo: ${goal}
- Contexto: ${context || "(sin más contexto)"}

Las categorías y los escenarios deben reflejar situaciones ESPECÍFICAS de su objetivo y contexto
(las personas, lugares y momentos que menciona), no temas turísticos genéricos.

Genera ÚNICAMENTE un objeto JSON con:
- "categories": EXACTAMENTE ${CATEGORY_COUNT} categorías de frases útiles para su objetivo y contexto concreto. Cada una en español, empieza por un emoji y tiene como máximo 30 caracteres (ej. "🎄 Cenas y brindis").
- "scenarios": EXACTAMENTE ${SCENARIO_COUNT} escenarios de conversación realistas que vivirá. Cada uno con:
  - "name": título en español, empieza por un emoji, máximo 30 caracteres.
  - "role": en español, el personaje realista con el que hablará el estudiante en esa situación (quién es y cómo se comporta). Lo interpretará la IA.
  - "missions": EXACTAMENTE 3 cosas que debe DECIR o PREGUNTAR EL ESTUDIANTE al personaje (no lo que hace el personaje). En español, concretas, verificables y adecuadas al nivel ${level}, con una frase de ejemplo en ${lang.name} entre paréntesis.

Formato:
{
  "categories": ["..."],
  "scenarios": [{ "name": "...", "role": "...", "missions": ["...", "...", "..."] }]
}`;

  // Hasta 2 intentos: Groq a veces rechaza el JSON o devuelve un plan incompleto.
  let best = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        // "medium" da planes mucho más relevantes que "low" (~5 s). El límite de tokens
        // evita que agote la respuesta razonando antes de escribir el JSON.
        reasoning_effort: "medium",
        max_completion_tokens: 4000,
      });
      const plan = sanitizePlan(JSON.parse(completion.choices[0].message.content));
      if (!best || plan.scenarios.length > best.scenarios.length) best = plan;
      if (best.categories.length >= 3 && best.scenarios.length >= SCENARIO_COUNT) break;
    } catch (error) {
      console.error(`Error generando el plan personalizado (intento ${attempt}):`, error?.message ?? error);
    }
  }

  // Si la IA no dio suficiente contenido, completamos con el plan genérico.
  return {
    categories: best?.categories.length >= 3 ? best.categories : FALLBACK_CATEGORIES,
    scenarios: best?.scenarios.length >= 1 ? best.scenarios : FALLBACK_SCENARIOS,
  };
}
