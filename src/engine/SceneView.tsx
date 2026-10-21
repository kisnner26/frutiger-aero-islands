import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { IslandScene, type SceneCallbacks, type SceneProps } from './IslandScene';
import { veil } from '../ui/veilStore';
import { sceneBridge } from './sceneBridge';
import { AeroLoader } from '../ui/AeroLoader';
import { tr } from '../i18n';

interface SceneViewProps {
  scene: SceneProps;
  callbacks: SceneCallbacks;
  controlRef: MutableRefObject<IslandScene | null>;
}

/** monta el motor pixi de forma diferida y lo destruye al desmontar. */
export function SceneView({ scene, callbacks, controlRef }: SceneViewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'cargando' | 'listo' | 'error'>('cargando');
  const [attempt, setAttempt] = useState(0);
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let engine: IslandScene | null = null;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMq = () => engine?.setReducedMotion(mq.matches);
    setStatus('cargando');

    IslandScene.create(
      host,
      {
        onSelect: (id) => cbRef.current.onSelect(id),
        onPlace: (x, y) => cbRef.current.onPlace(x, y),
        onMove: (id, x, y) => cbRef.current.onMove(id, x, y),
        onInvalid: (t) => cbRef.current.onInvalid(t),
        onPop: (i) => cbRef.current.onPop(i),
        onZoom: (z) => cbRef.current.onZoom(z),
      },
      mq.matches,
    )
      .then((s) => {
        if (cancelled) {
          s.destroy();
          return;
        }
        engine = s;
        controlRef.current = s;
        sceneBridge.set(s);
        if (import.meta.env.DEV) (window as unknown as { __scene?: IslandScene }).__scene = s;
        s.setProps(sceneRef.current);
        mq.addEventListener('change', onMq);
        setStatus('listo');
        veil.hide();
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
        veil.hide(true);
      });

    return () => {
      cancelled = true;
      mq.removeEventListener('change', onMq);
      engine?.destroy();
      controlRef.current = null;
      sceneBridge.set(null);
    };
  }, [attempt, controlRef]);

  useEffect(() => {
    controlRef.current?.setProps(scene);
  }, [scene, controlRef]);

  return (
    <div className="scene-view">
      <div ref={hostRef} className="scene-view__host" />
      {status === 'cargando' && <AeroLoader variant="scene" text={tr('cargando la isla...', 'loading the island...')} detail={tr('acomodando tu jardín y sus reflejos...', 'arranging your garden and its reflections...')} />}
      {status === 'error' && (
        <div className="scene-view__msg" role="alert">
          <p>{tr('no se pudo cargar la isla.', 'the island could not be loaded.')}</p>
          <button type="button" className="vista-button" onClick={() => setAttempt((n) => n + 1)}>
            {tr('reintentar', 'retry')}
          </button>
        </div>
      )}
    </div>
  );
}
