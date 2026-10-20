export type MemoryKind = 'creacion' | 'foto';

/** límites explícitos del álbum local. */
export const MEMORY_LIMITS = { count: 40, bytes: 14 * 1024 * 1024, photoBytes: 900 * 1024 } as const;

export const KIND_LABEL: Record<MemoryKind, string> = {
  creacion: 'creación de la isla',
  foto: 'fotografía',
};

export interface Memory {
  id: string;
  kind: MemoryKind;
  /** fecha del reloj del dispositivo, en iso. */
  at: string;
  text: string;
  photo?: Blob;
  width?: number;
  height?: number;
  bytes: number;
  /** de momento solo existen recuerdos locales; la sincronización necesita cuentas y almacenamiento remoto. */
  origin: 'local';
}

export type LimitProblem = 'cantidad' | 'foto-grande' | 'almacenamiento';

/** decide si cabe un recuerdo nuevo; null si cabe. */
export function checkLimits(current: { count: number; bytes: number }, add: { bytes: number }): LimitProblem | null {
  if (add.bytes > MEMORY_LIMITS.photoBytes) return 'foto-grande';
  if (current.count >= MEMORY_LIMITS.count) return 'cantidad';
  if (current.bytes + add.bytes > MEMORY_LIMITS.bytes) return 'almacenamiento';
  return null;
}

export const LIMIT_TEXT: Record<LimitProblem, string> = {
  cantidad: `el álbum está lleno (${MEMORY_LIMITS.count} recuerdos). elimina uno para guardar otro.`,
  'foto-grande': 'la fotografía es demasiado pesada para guardarla.',
  almacenamiento: 'no queda espacio en el álbum. elimina algún recuerdo.',
};

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} b`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} kb`;
  return `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} mb`;
}

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

/** agrupa por día, del más reciente al más antiguo. */
export function groupByDay(memories: readonly Memory[]): Array<{ day: string; items: Memory[] }> {
  const sorted = [...memories].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  const groups: Array<{ day: string; items: Memory[] }> = [];
  for (const m of sorted) {
    const day = formatDay(m.at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(m);
    else groups.push({ day, items: [m] });
  }
  return groups;
}

export function memoryFileName(m: Pick<Memory, 'at' | 'kind'>): string {
  const d = new Date(m.at);
  const p = (n: number) => String(n).padStart(2, '0');
  return `isla-${m.kind}-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.jpg`;
}
