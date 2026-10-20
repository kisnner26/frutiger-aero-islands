import { checkLimits, LIMIT_TEXT, type LimitProblem, type Memory, type MemoryKind } from './logic';

const DB = 'frutiger-aero-islands';
const STORE = 'recuerdos';

export class MemoryLimitError extends Error {
  constructor(public problem: LimitProblem) {
    super(LIMIT_TEXT[problem]);
  }
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('sin indexeddb'));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('no se pudo abrir el álbum'));
  });
}

function done<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listMemories(): Promise<Memory[]> {
  const db = await open();
  try {
    const all = (await done(db.transaction(STORE).objectStore(STORE).getAll())) as Memory[];
    return all.sort((a, b) => (a.at < b.at ? 1 : -1));
  } finally {
    db.close();
  }
}

export function usageOf(all: readonly Memory[]) {
  return { count: all.length, bytes: all.reduce((n, m) => n + m.bytes, 0) };
}

export async function addMemory(input: { kind: MemoryKind; text: string; photo?: Blob; width?: number; height?: number }, opts: { unique?: boolean } = {}): Promise<Memory | null> {
  const db = await open();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const all = (await done(store.getAll())) as Memory[];
    if (opts.unique && all.some((m) => m.kind === input.kind)) {
      tx.abort();
      return null;
    }
    const bytes = input.photo?.size ?? 0;
    const problem = checkLimits(usageOf(all), { bytes });
    if (problem) {
      tx.abort();
      throw new MemoryLimitError(problem);
    }
    const memory: Memory = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind: input.kind,
      at: new Date().toISOString(),
      text: input.text,
      photo: input.photo,
      width: input.width,
      height: input.height,
      bytes,
      origin: 'local',
    };
    await done(store.add(memory));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    notify();
    return memory;
  } finally {
    db.close();
  }
}

export async function removeMemory(id: string): Promise<void> {
  const db = await open();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    notify();
  } finally {
    db.close();
  }
}

export async function hasKind(kind: MemoryKind): Promise<boolean> {
  return (await listMemories()).some((m) => m.kind === kind);
}

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((l) => l());
}
export function subscribeMemories(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** añade la fotografía a un recuerdo ya registrado (p. ej. la creación de la isla), respetando los límites. */
export async function attachPhoto(id: string, photo: Blob, width: number, height: number): Promise<boolean> {
  const db = await open();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const all = (await done(store.getAll())) as Memory[];
    const target = all.find((m) => m.id === id);
    if (!target || target.photo) {
      tx.abort();
      return false;
    }
    const problem = checkLimits({ count: Math.max(0, all.length - 1), bytes: usageOf(all).bytes - target.bytes }, { bytes: photo.size });
    if (problem) {
      tx.abort();
      return false;
    }
    await done(store.put({ ...target, photo, width, height, bytes: photo.size }));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    notify();
    return true;
  } finally {
    db.close();
  }
}
