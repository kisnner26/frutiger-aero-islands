import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { WorldIsland } from '../world/archipelago';
import type { WorldView as WorldViewState } from '../world/worldState';
import { WorldScene, type WorldCallbacks } from './WorldScene';

interface Props {
  islands: WorldIsland[];
  initial: WorldViewState | null;
  callbacks: WorldCallbacks;
  controlRef: MutableRefObject<WorldScene | null>;
}

/** monta la escena del mundo de forma diferida y la destruye al desmontar. */
export function WorldView({ islands, initial, callbacks, controlRef }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'cargando' | 'listo' | 'error'>('cargando');
  const [attempt, setAttempt] = useState(0);
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;
  const initialRef = useRef(initial);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let engine: WorldScene | null = null;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMq = () => engine?.setReducedMotion(mq.matches);
    setStatus('cargando');
    WorldScene.create(
      host,
      { onSelect: (id) => cbRef.current.onSelect(id), onView: (v) => cbRef.current.onView(v), onMode: (m) => cbRef.current.onMode(m) },
      mq.matches,
      islands,
      initialRef.current,
    )
      .then((s) => {
        if (cancelled) {
          s.destroy();
          return;
        }
        engine = s;
        controlRef.current = s;
        mq.addEventListener('change', onMq);
        setStatus('listo');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
      mq.removeEventListener('change', onMq);
      engine?.destroy();
      controlRef.current = null;
    };
  }, [attempt, islands, controlRef]);

  return (
    <div className="scene-view">
      <div ref={hostRef} className="scene-view__host" />
      {status === 'cargando' && (
        <p className="scene-view__msg" role="status">
          preparando el mundo...
        </p>
      )}
      {status === 'error' && (
        <div className="scene-view__msg" role="alert">
          <p>no se pudo cargar el mundo.</p>
          <button type="button" className="vista-button" onClick={() => setAttempt((n) => n + 1)}>
            reintentar
          </button>
        </div>
      )}
    </div>
  );
}
