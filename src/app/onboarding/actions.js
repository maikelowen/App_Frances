'use server';

import { auth, clerkClient } from "@clerk/nextjs/server";
import { LANGUAGES, LEVELS, GOAL_MAX, CONTEXT_MAX, NAME_MAX, RELATION_MAX, MAX_COMPANIONS, DAILY_MINUTES } from "@/lib/languages";
import { generatePlan } from "@/lib/plan";

export async function saveProfile(prevState, formData) {
  // Las Server Actions se pueden llamar con un POST directo: siempre comprobar sesión.
  const { userId } = await auth();
  if (!userId) return { error: "Tu sesión ha caducado. Vuelve a iniciar sesión." };

  const language = String(formData.get("language") || "");
  const level = String(formData.get("level") || "");
  const goal = String(formData.get("goal") || "").trim();
  const context = String(formData.get("context") || "").trim();
  const name = String(formData.get("name") || "").trim().slice(0, NAME_MAX);
  const rawDate = String(formData.get("tripDate") || "");
  const tripDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null;
  const dailyMinutes = DAILY_MINUTES.includes(Number(formData.get("dailyMinutes"))) ? Number(formData.get("dailyMinutes")) : 10;

  // Personas que le acompañan o con las que hablará: pares nombre/relación del formulario.
  const relations = formData.getAll("companionRelation");
  const companions = formData.getAll("companionName")
    .map((n, i) => ({
      name: String(n || "").trim().slice(0, NAME_MAX),
      relation: String(relations[i] || "").trim().slice(0, RELATION_MAX),
    }))
    .filter((c) => c.name)
    .slice(0, MAX_COMPANIONS);

  if (!name) return { error: "Dinos cómo te llamas." };
  if (!LANGUAGES[language]) return { error: "Elige el idioma que quieres aprender." };
  if (!LEVELS[level]) return { error: "Elige tu nivel actual." };
  if (goal.length < 5) return { error: "Cuéntanos un poco más sobre tu objetivo." };
  if (goal.length > GOAL_MAX || context.length > CONTEXT_MAX) return { error: "El texto es demasiado largo." };

  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  const plan = await generatePlan({ language, level, goal, context, name, companions });
  await client.users.replaceUserMetadata(userId, {
    publicMetadata: {
      ...user.publicMetadata,
      profile: { name, companions, language, level, goal, context, tripDate, dailyMinutes, ...plan, updatedAt: new Date().toISOString() },
    },
  });

  // El formulario enseña el plan ("revelación") antes de entrar en la app.
  return {
    ok: true,
    plan: { title: plan.title, categories: plan.categories, scenarios: plan.scenarios.map((s) => s.name), tripDate, dailyMinutes, language },
  };
}
