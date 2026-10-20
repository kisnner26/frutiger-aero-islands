import { useEffect, useState, useSyncExternalStore } from 'react';
import { glassBubble } from '../art/aero';
import { veil } from './veilStore';

/** velo de cristal: burbuja que se abre, ondas y un pez; deja claro que algo se está abriendo. */
export function Veil() {
  const s = useSyncExternalStore(veil.subscribe, veil.get);
  const [bubble, setBubble] = useState('');
  const [mounted, setMounted] = useState(s.visible);

  useEffect(() => {
    setBubble(glassBubble(320, { seed: 6 }).toDataURL());
  }, []);

  useEffect(() => {
    if (s.visible) {
      setMounted(true);
      return;
    }
    const t = window.setTimeout(() => setMounted(false), 650);
    return () => window.clearTimeout(t);
  }, [s.visible, s.key]);

  if (!mounted) return null;
  return (
    <div className={`veil${s.visible ? ' is-on' : ' is-off'}`} key={s.key} role="status" aria-live="polite" aria-label={s.text}>
      <div className="veil__stage" aria-hidden="true">
        <span className="veil__ring veil__ring--a" />
        <span className="veil__ring veil__ring--b" />
        {bubble && <img className="veil__bubble" src={bubble} alt="" />}
        <span className="veil__fish veil__fish--a" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}assets/ui/pez-payaso.svg)` }} />
        <span className="veil__fish veil__fish--b" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}assets/decorations/pez.svg)` }} />
      </div>
      <p className="veil__text">{s.text}</p>
    </div>
  );
}
