import { tr } from '../../i18n';

const KEY = 'frutiger-aero-islands:botella';
/** una botella nueva llega al menos cada tanto, y desaparece si nadie la abre. */
export const BOTTLE_EVERY_MS = 8 * 60_000;
export const BOTTLE_STAYS_MS = 45_000;

export const NOTES: readonly string[] = [
  tr('alguien dejó una luz encendida en tu orilla', 'someone left a light on at your shore'),
  tr('el mar de hoy huele a burbujas nuevas', "today's sea smells like new bubbles"),
  tr('un pez te manda saludos desde el arrecife', 'a fish sends greetings from the reef'),
  tr('si pones una fuente, las visitas se quedan más', 'put a fountain down and visitors stay longer'),
  tr('esta isla se ve mejor al atardecer', 'this island looks best at sunset'),
  tr('las nubes de cristal guardan destellos para ti', 'glass clouds are saving sparkles for you'),
  tr('visita otra isla: te llevas una idea', 'visit another island: you will take an idea home'),
  tr('un combo largo hace sonar mejor las burbujas', 'a long combo makes bubbles sing better'),
  tr('la marea sube cuando nadie mira', 'the tide rises when nobody is looking'),
  tr('hay una estrella escondida detrás de tu palmera', 'a star is hiding behind your palm tree'),
];

export function pickNote(rand = Math.random): { note: string; reward: number } {
  return { note: NOTES[Math.floor(rand() * NOTES.length) % NOTES.length], reward: 10 + Math.floor(rand() * 21) };
}

export function nextBottleAt(): number {
  try {
    const v = Number(window.localStorage.getItem(KEY));
    if (Number.isFinite(v) && v > 0) return v;
  } catch {
    /* sin almacenamiento */
  }
  return Date.now() + 60_000;
}

export function scheduleNext(now = Date.now()) {
  try {
    window.localStorage.setItem(KEY, String(now + BOTTLE_EVERY_MS));
  } catch {
    /* sin almacenamiento */
  }
}
