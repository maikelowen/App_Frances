// Progreso del usuario: frasebook, repasos espaciados, pasaporte, racha y sesión del día.
// Son funciones puras sobre un objeto JSON; ProgressProvider lo guarda en el dispositivo.
// Si más adelante se añade una base de datos, solo cambia dónde se guarda este objeto.

const VERSION = 1;

// Caja de repaso -> días hasta el siguiente repaso. Al llegar a la última caja, la frase está dominada.
export const INTERVALS = [0, 1, 3, 7, 21];
const MASTERED_BOX = INTERVALS.length - 1;

// Tamaño de la sesión diaria según los minutos que eligió el usuario en el onboarding.
export const SESSION_SIZES = {
  5: { reviews: 2, news: 3, scene: false },
  10: { reviews: 3, news: 4, scene: true },
  15: { reviews: 5, news: 6, scene: true },
};

export function emptyProgress() {
  return { version: VERSION, cards: {}, passport: [], days: {}, sessions: {} };
}

// ---------- Fechas (siempre en la zona horaria del usuario) ----------

export function today(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(day, n) {
  const [y, m, d] = day.split('-').map(Number);
  return today(new Date(y, m - 1, d + n));
}

export function daysBetween(from, to) {
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  return Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 86_400_000);
}

// ---------- Tarjetas ----------

// Identificador estable a partir del texto (misma frase = misma tarjeta).
export function cardId(text) {
  const s = String(text).normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return `c${h.toString(36)}`;
}

function touchDay(p, day) {
  p.days[day] ??= { cards: [], grammar: 0, scenes: 0 };
  return p.days[day];
}

// Añade tarjetas nuevas al frasebook (las repetidas se ignoran). Devuelve los ids añadidos.
export function addCards(p, cards, source = 'ai') {
  const added = [];
  for (const c of cards) {
    if (!c?.text) continue;
    const id = cardId(c.text);
    if (p.cards[id]) continue;
    p.cards[id] = {
      id,
      category: c.category,
      text: c.text,
      translation: c.translation,
      ...(c.romanization ? { romanization: c.romanization } : {}),
      ...(c.grammar ? { grammar: c.grammar } : {}),
      source,
      status: 'new', // new | learning | mastered
      box: 0,
      due: null,
      lapses: 0,
      addedAt: today(),
    };
    added.push(id);
  }
  return added;
}

// Resultado de decir la frase en voz alta. Es lo que hace avanzar (o retroceder) la tarjeta.
export function recordSpoken(p, id, ok) {
  const card = p.cards[id];
  if (!card) return;
  const day = today();
  if (ok) {
    card.box = card.status === 'new' ? 1 : Math.min(card.box + 1, MASTERED_BOX);
    card.due = addDays(day, INTERVALS[card.box]);
    card.status = card.box >= MASTERED_BOX ? 'mastered' : 'learning';
  } else if (card.status !== 'new') {
    // Fallo en un repaso: vuelve a la primera caja y se repite pronto.
    card.box = 1;
    card.due = day;
    card.status = 'learning';
    card.lapses += 1;
  }
  card.lastPracticed = day;
  const d = touchDay(p, day);
  if (!d.cards.includes(id)) d.cards.push(id);
}

export function recordGrammar(p, id, ok) {
  const card = p.cards[id];
  if (!card) return;
  card.grammarOk = ok;
  if (ok) touchDay(p, today()).grammar += 1;
}

export function dueCards(p, day = today()) {
  return Object.values(p.cards)
    .filter((c) => c.status !== 'new' && c.due && c.due <= day)
    .sort((a, b) => a.due.localeCompare(b.due) || b.lapses - a.lapses);
}

export function newCards(p, category) {
  return Object.values(p.cards).filter((c) => c.status === 'new' && (!category || c.category === category));
}

// ---------- Escenas y pasaporte ----------

export function recordScene(p, { scenarioIndex, name, stars, twist = null }) {
  const day = today();
  p.passport.push({ scenarioIndex, name, stars: stars ?? null, twist, date: day });
  touchDay(p, day).scenes += 1;
}

// Por nombre: si el plan se regenera, los índices de las escenas cambian.
export function stampsFor(p, sceneName) {
  return p.passport.filter((s) => s.name === sceneName);
}

// ---------- Estadísticas ----------

function isActive(d) {
  return d && (d.cards.length > 0 || d.scenes > 0);
}

export function streak(p, day = today()) {
  // Si hoy aún no ha practicado, la racha sigue viva desde ayer.
  let cursor = isActive(p.days[day]) ? day : addDays(day, -1);
  let count = 0;
  while (isActive(p.days[cursor])) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export function stats(p) {
  const cards = Object.values(p.cards);
  return {
    learned: cards.filter((c) => c.status !== 'new').length,
    mastered: cards.filter((c) => c.status === 'mastered').length,
    scenes: p.passport.length,
    streak: streak(p),
    practicedToday: isActive(p.days[today()]),
  };
}

// ---------- Sesión diaria ----------

// Devuelve (y si no existe, crea) la sesión de hoy: repasos pendientes + frases nuevas + una escena.
// `missingNew` indica cuántas frases nuevas faltan por generar con la IA.
export function ensureSession(p, minutes, scenarios, planId) {
  const day = today();
  // Si el plan cambió hoy, la sesión se rehace (las escenas son otras).
  if (p.sessions[day] && p.sessions[day].planId === planId) return p.sessions[day];

  const size = SESSION_SIZES[minutes] ?? SESSION_SIZES[10];
  const reviews = dueCards(p, day).slice(0, size.reviews).map((c) => c.id);
  const news = newCards(p).slice(0, size.news).map((c) => c.id);

  // Escena del día: la que menos sellos tiene.
  let sceneIndex = null;
  if (size.scene && scenarios.length > 0) {
    const counts = scenarios.map((sc) => stampsFor(p, sc.name).length);
    sceneIndex = counts.indexOf(Math.min(...counts));
  }

  // Solo guardamos las sesiones recientes.
  for (const key of Object.keys(p.sessions)) if (key < addDays(day, -7)) delete p.sessions[key];

  p.sessions[day] = {
    date: day,
    planId,
    queue: [...reviews, ...news],
    reviews: reviews.length,
    missingNew: size.news - news.length,
    done: [],
    sceneIndex,
    sceneDone: false,
    completed: false,
  };
  return p.sessions[day];
}

// Tras generar frases nuevas, las mete en la sesión de hoy.
export function fillSession(p, ids) {
  const s = p.sessions[today()];
  if (!s) return;
  const extra = ids.filter((id) => !s.queue.includes(id)).slice(0, s.missingNew);
  s.queue.push(...extra);
  // Si la IA no aportó nada nuevo (todo repetido), no seguimos pidiendo: la sesión va con lo que hay.
  s.missingNew = extra.length === 0 ? 0 : Math.max(0, s.missingNew - extra.length);
}

export function markSessionCard(p, id) {
  const s = p.sessions[today()];
  if (s && !s.done.includes(id)) s.done.push(id);
}

export function markSessionScene(p) {
  const s = p.sessions[today()];
  if (s) s.sceneDone = true;
}

export function sessionState(s) {
  if (!s) return null;
  const cardsLeft = s.queue.filter((id) => !s.done.includes(id));
  const sceneLeft = s.sceneIndex !== null && !s.sceneDone;
  const total = s.queue.length + (s.sceneIndex !== null ? 1 : 0);
  const doneCount = s.done.length + (s.sceneIndex !== null && s.sceneDone ? 1 : 0);
  return { cardsLeft, sceneLeft, total, doneCount, finished: cardsLeft.length === 0 && !sceneLeft && s.missingNew === 0 };
}

// Categoría para generar frases nuevas: la que menos tarjetas tiene en el frasebook.
export function leastPracticedCategory(p, categories) {
  const counts = categories.map((cat) => Object.values(p.cards).filter((c) => c.category === cat).length);
  return categories[counts.indexOf(Math.min(...counts))];
}
