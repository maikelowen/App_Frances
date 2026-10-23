'use server';

import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LANGUAGES, LEVELS, GOAL_MAX, CONTEXT_MAX } from "@/lib/languages";
import { generatePlan } from "@/lib/plan";

export async function saveProfile(prevState, formData) {
  // Las Server Actions se pueden llamar con un POST directo: siempre comprobar sesión.
  const { userId } = await auth();
  if (!userId) return { error: "Tu sesión ha caducado. Vuelve a iniciar sesión." };

  const language = String(formData.get("language") || "");
  const level = String(formData.get("level") || "");
  const goal = String(formData.get("goal") || "").trim();
  const context = String(formData.get("context") || "").trim();

  if (!LANGUAGES[language]) return { error: "Elige el idioma que quieres aprender." };
  if (!LEVELS[level]) return { error: "Elige tu nivel actual." };
  if (goal.length < 5) return { error: "Cuéntanos un poco más sobre tu objetivo." };
  if (goal.length > GOAL_MAX || context.length > CONTEXT_MAX) return { error: "El texto es demasiado largo." };

  const plan = await generatePlan({ language, level, goal, context });

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  await client.users.replaceUserMetadata(userId, {
    publicMetadata: {
      ...user.publicMetadata,
      profile: { language, level, goal, context, ...plan, updatedAt: new Date().toISOString() },
    },
  });

  redirect("/");
}
