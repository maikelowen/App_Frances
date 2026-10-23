import { LANGUAGES, LEVELS } from "./languages";

// El perfil vive en user.publicMetadata.profile (Clerk). Solo se escribe desde el
// servidor, así que el usuario no puede manipularlo desde el navegador.
//
// Forma:
// {
//   language: "fr", level: "A2", goal: string, context: string,
//   categories: string[],                                 // categorías de tarjetas
//   scenarios: [{ name, role, missions: [string x3] }],   // escenarios de roleplay
//   updatedAt: ISO string                                 // identifica la versión del plan
// }
export function readProfile(user) {
  const p = user?.publicMetadata?.profile;
  if (!p || !LANGUAGES[p.language] || !LEVELS[p.level]) return null;
  if (!Array.isArray(p.categories) || !Array.isArray(p.scenarios)) return null;
  return p;
}
