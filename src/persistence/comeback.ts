const KEY = 'frutiger-aero-islands:ultima-visita';
const DAY_MS = 86_400_000;

/** días de calendario entre dos fechas aaaa-mm-dd. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/** regalo por volver: crece con los días fuera pero tiene tope, para premiar volver y no ausentarse. */
export function comebackGift(daysAway: number): number {
  if (!Number.isFinite(daysAway) || daysAway < 1) return 0;
  return Math.min(200, 40 + 30 * Math.min(daysAway, 5));
}

/** registra la visita de hoy y devuelve el regalo si hace al menos un día que no entrabas. */
export function visitToday(now = new Date()): { days: number; gift: number } {
  const today = now.toISOString().slice(0, 10);
  let last: string | null = null;
  try {
    last = window.localStorage.getItem(KEY);
    window.localStorage.setItem(KEY, today);
  } catch {
    return { days: 0, gift: 0 };
  }
  if (!last || !/^\d{4}-\d{2}-\d{2}$/.test(last)) return { days: 0, gift: 0 };
  const days = daysBetween(last, today);
  return { days, gift: comebackGift(days) };
}
