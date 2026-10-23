import { currentUser } from "@clerk/nextjs/server";
import { readProfile } from "./profile";

// Comprobación de sesión para las rutas de /api. Devuelve también el perfil,
// leído del servidor (nunca del cuerpo de la petición).
export async function requireUser() {
  const user = await currentUser();
  if (!user) {
    return { user: null, profile: null, unauthorized: Response.json({ error: "No autorizado" }, { status: 401 }) };
  }
  return { user, profile: readProfile(user), unauthorized: null };
}

export function missingProfile() {
  return Response.json({ error: "Completa el onboarding primero" }, { status: 409 });
}
