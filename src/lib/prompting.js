// Fragmentos de prompt compartidos por las rutas de IA.

// "Bao-Chau (mi pareja), Mai (nuestra bebé)"
export function describeCompanions(companions) {
  return (Array.isArray(companions) ? companions : [])
    .filter((c) => c?.name)
    .map((c) => (c.relation ? `${c.name} (${c.relation})` : c.name))
    .join(", ");
}

// Bloque con quién es el estudiante, para personalizar frases y escenas.
export function studentBlock(profile, fallbackName) {
  const name = profile?.name || fallbackName;
  const companions = describeCompanions(profile?.companions);
  return [
    name ? `- Nombre: ${name}` : null,
    companions ? `- Personas importantes en su situación: ${companions}` : null,
    `- Objetivo: ${profile.goal}`,
    `- Contexto: ${profile.context || "(sin más contexto)"}`,
  ].filter(Boolean).join("\n");
}

// Evita frases con huecos tipo "Je m'appelle [nombre]": se pronuncian mal y no se pueden corregir.
export function noPlaceholdersRule(profile, fallbackName) {
  const name = profile?.name || fallbackName;
  const companions = describeCompanions(profile?.companions);
  return `NUNCA uses huecos ni marcadores como [nombre], [ciudad], <...>, X o "..." dentro de las frases.
Usa datos reales del estudiante${name ? ` (se llama ${name}${companions ? `; personas importantes: ${companions}` : ""})` : ""} y de su contexto, y menciónalos cuando encaje de forma natural.
Si falta un dato, inventa uno concreto y realista.`;
}

// Para idiomas con otra escritura, pide la romanización junto a cada texto.
export function romanizationRule(lang) {
  if (!lang.romanization) return "";
  return `Cada texto en ${lang.name} debe ir acompañado de su transcripción en ${lang.romanization} en el campo "romanization".`;
}
