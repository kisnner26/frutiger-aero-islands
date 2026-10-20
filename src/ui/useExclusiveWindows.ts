import { useEffect, useRef } from 'react';

const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 680px)').matches;

/**
 * en el teléfono solo cabe una ventana a la vez: al abrir una, se cierran las demás.
 * `open` dice cuáles están abiertas y `close` cómo cerrar cada una.
 */
export function useExclusiveWindows(open: Record<string, boolean>, close: Record<string, () => void>) {
  const prev = useRef(open);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const before = prev.current;
    prev.current = open;
    if (!isPhone()) return;
    const opened = Object.keys(open).filter((k) => open[k] && !before[k]);
    if (!opened.length) return;
    for (const k of Object.keys(open)) if (open[k] && !opened.includes(k)) closeRef.current[k]?.();
  });
}
