import { saveIsland, supabase } from './supabase';
import type { Doc } from '../features/editor/commands';

type Rev = { current: number };

const codeOf = (e: unknown) => String((e as { code?: unknown } | null)?.code ?? '');
const textOf = (e: unknown) => String((e as { message?: unknown } | null)?.message ?? e ?? '');
const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

/** motivo corto y legible de un fallo al guardar (para decirle a la persona qué hacer). */
export function describeSaveError(e: unknown): string {
  const code = codeOf(e);
  const msg = textOf(e).toLowerCase();
  if (code === '40001' || msg.includes('conflicto')) return 'tu isla se abrió en otro lugar';
  if (code === '42501' || msg.includes('sesión') || msg.includes('jwt') || msg.includes('not authenticated')) return 'tu sesión caducó: vuelve a conectar';
  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('load failed') || msg.includes('timeout')) return 'sin conexión estable';
  if (code === '22023' || msg.includes('no es válido') || msg.includes('inválid') || msg.includes('fuera de rango')) return 'un objeto no es válido';
  return '';
}

async function currentRevision(id: string): Promise<number | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('islands').select('revision').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return Number((data as { revision: unknown }).revision);
}

/**
 * guarda la isla y se recupera sola de los fallos habituales en el teléfono:
 * - revisión desfasada (una respuesta se perdió y el servidor ya tenía el cambio): se vuelve a leer la revisión y se reintenta;
 * - sesión caducada (navegadores integrados de apps que suspenden la pestaña): se renueva la sesión y se reintenta;
 * - red inestable: dos reintentos cortos.
 * la persona dueña es la única que edita su isla, así que lo que ve en pantalla manda.
 */
export async function saveIslandResilient(id: string, rev: Rev, doc: Doc): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      rev.current = await saveIsland(id, rev.current, doc);
      return;
    } catch (e) {
      lastError = e;
      console.warn('[guardado] intento', attempt + 1, codeOf(e), textOf(e));
      const reason = describeSaveError(e);
      if (reason === 'tu isla se abrió en otro lugar') {
        const r = await currentRevision(id);
        if (r === null) break;
        rev.current = r;
      } else if (reason.startsWith('tu sesión caducó')) {
        if (!supabase) break;
        const { error } = await supabase.auth.refreshSession();
        if (error) break;
      } else if (reason === 'sin conexión estable') {
        await sleep(1200 * (attempt + 1));
      } else break;
    }
  }
  throw lastError;
}
