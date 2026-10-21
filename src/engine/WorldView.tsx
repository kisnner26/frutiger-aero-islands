import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { WorldIsland } from '../world/archipelago';
import type { WorldView as WorldViewState } from '../world/worldState';
import { veil } from '../ui/veilStore';
import { WorldScene, type WorldCallbacks } from './WorldScene';
import { AeroLoader } from '../ui/AeroLoader';
import { tr } from '../i18n';

interface Props {
  islands: WorldIsland[];
  initial: WorldViewState | null;
  callbacks: WorldCallbacks;
  controlRef: MutableRefObject<WorldScene | null>;
  /** cambia solo cuando hay que rehacer el mundo (mi isla o mi país); las islas nuevas se añaden sin reconstruir. */
  rebuildKey: string;
}

/** monta la escena del mundo de forma diferida y la destruye al desmontar. */
export function WorldView({ islands, initial, callbacks, controlRef, rebuildKey }: Props) {
  const islandsRef = useRef(islands);
  islandsRef.current = islands;
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'cargando' | 'listo' | 'error'>('cargando');
  const [attempt, setAttempt] = useState(0);
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;
  const initialRef = useRef(initial);
  initialRef.current = initial;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let engine: WorldScene | null = null;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMq = () => engine?.setReducedMotion(mq.matches);
    setStatus('cargando');
    let timedOut = false;
    let ready = false;
    // si el motor no arranca en 20 s se ofrece reintentar en vez de dejar la pantalla cargando
    const deadline = window.setTimeout(() => {
      if (ready || cancelled) return;
      timedOut = true;
      setStatus('error');
      veil.hide(true);
    }, 20_000);
    WorldScene.create(
      host,
      { onSelect: (id) => cbRef.current.onSelect(id), onView: (v) => cbRef.current.onView(v), onMode: (m) => cbRef.current.onMode(m), onCountry: (code) => cbRef.current.onCountry(code), onCell: (cx, cy) => cbRef.current.onCell?.(cx, cy) },
      mq.matches,
      islandsRef.current,
      initialRef.current,
    )
      .then((s) => {
        window.clearTimeout(deadline);
        if (cancelled || timedOut) {
          s.destroy();
          return;
        }
        engine = s;
        controlRef.current = s;
        mq.addEventListener('change', onMq);
        ready = true;
        setStatus('listo');
        veil.hide();
        // si el navegador pierde el contexto gráfico (memoria, segundo plano), la escena se vuelve a crear sola
        host.querySelector('canvas')?.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          if (!cancelled) setAttempt((n) => n + 1);
        });
      })
      .catch(() => {
        window.clearTimeout(deadline);
        if (!cancelled) setStatus('error');
        veil.hide(true);
      });
    return () => {
      window.clearTimeout(deadline);
      cancelled = true;
      mq.removeEventListener('change', onMq);
      engine?.destroy();
      controlRef.current = null;
    };
  }, [attempt, rebuildKey, controlRef]);

  useEffect(() => {
    void controlRef.current?.addIslands(islands);
  }, [islands, controlRef]);

  return (
    <div className="scene-view">
      <div ref={hostRef} className="scene-view__host" />
      {status === 'cargando' && <AeroLoader variant="scene" text={tr('preparando el mundo...', 'preparing the world...')} detail={tr('desplegando el atlas interior...', 'unfolding the inner atlas...')} />}
      {status === 'error' && (
        <div className="scene-view__msg" role="alert">
          <p>{tr('no se pudo cargar el mundo.', 'the world could not be loaded.')}</p>
          <button type="button" className="vista-button" onClick={() => setAttempt((n) => n + 1)}>
            {tr('reintentar', 'retry')}
          </button>
        </div>
      )}
    </div>
  );
}
