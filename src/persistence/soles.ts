/** soles ganados fuera de la isla (minijuegos del teléfono, arcade, duelos): se guardan y la isla los cobra al abrirse. */
const PENDING = 'frutiger-aero-islands:soles-pendientes';
const DAY = 'frutiger-aero-islands:soles-dia';
/** tope diario de los minijuegos, para que el progreso de la isla siga teniendo sentido. */
export const DAILY_CAP = 400;

const listeners = new Set<() => void>();
const today = () => new Date().toISOString().slice(0, 10);

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* sin almacenamiento: el premio se pierde, pero el juego sigue */
  }
}

export function earnedToday(): number {
  try {
    const d = JSON.parse(read(DAY) ?? 'null') as { day: string; total: number } | null;
    return d && d.day === today() ? Number(d.total) || 0 : 0;
  } catch {
    return 0;
  }
}

export function remainingToday(): number {
  return Math.max(0, DAILY_CAP - earnedToday());
}

/** suma soles respetando el tope diario; devuelve los que de verdad se concedieron. */
export function awardSoles(amount: number, { capped = true }: { capped?: boolean } = {}): number {
  const wanted = Math.max(0, Math.floor(amount));
  const granted = capped ? Math.min(wanted, remainingToday()) : wanted;
  if (granted <= 0) return 0;
  write(PENDING, String((Number(read(PENDING)) || 0) + granted));
  if (capped) write(DAY, JSON.stringify({ day: today(), total: earnedToday() + granted }));
  listeners.forEach((l) => l());
  return granted;
}

/** entrega los soles pendientes (y los borra). */
export function takePendingSoles(): number {
  const n = Number(read(PENDING)) || 0;
  if (n > 0) write(PENDING, '0');
  return n;
}

export function subscribeSoles(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
