/**
 * fetch con tiempo límite y reintentos: una consulta nunca queda esperando para siempre y los fallos de red
 * pasajeros (señal débil, servidor ocupado) se reintentan solos con espera creciente.
 * solo se reintentan las lecturas; una escritura que ya salió no se repite para no aplicarla dos veces.
 */
const TIMEOUT_MS = 15_000;
const RETRY_DELAYS = [400, 1200];

const isRead = (req: Request) => req.method === 'GET' || req.method === 'HEAD';
const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

async function once(req: Request, timeoutMs: number): Promise<Response> {
  const ctl = new AbortController();
  const timer = window.setTimeout(() => ctl.abort(new DOMException('tiempo agotado', 'TimeoutError')), timeoutMs);
  const onAbort = () => ctl.abort(req.signal.reason);
  req.signal.addEventListener('abort', onAbort, { once: true });
  try {
    return await fetch(req, { signal: ctl.signal });
  } finally {
    window.clearTimeout(timer);
    req.signal.removeEventListener('abort', onAbort);
  }
}

export const resilientFetch: typeof fetch = async (input, init) => {
  const req = new Request(input, init);
  const read = isRead(req);
  const attempts = read ? RETRY_DELAYS.length + 1 : 1;
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await sleep(RETRY_DELAYS[i - 1]);
    if (req.signal.aborted) throw req.signal.reason;
    try {
      // el cuerpo de una petición solo se puede enviar una vez: se clona antes de cada intento
      const res = await once(req.clone(), TIMEOUT_MS);
      if (read && (res.status >= 500 || res.status === 429) && i < attempts - 1) {
        lastError = new Error(`http ${res.status}`);
        continue;
      }
      return res;
    } catch (error) {
      lastError = error;
      if (req.signal.aborted) throw error;
      if (!read && !(error instanceof TypeError)) throw error; // escritura con tiempo agotado: no se repite
      if (!read) break;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('sin conexión con el servidor');
};
