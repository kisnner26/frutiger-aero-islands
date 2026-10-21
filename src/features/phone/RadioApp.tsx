import { useEffect, useRef, useSyncExternalStore } from 'react';
import { radio } from '../../audio/radio/engine';
import { AMBIENCE_IDS, AMBIENCE_LABELS, STATIONS, type StationId } from '../../audio/radio/stations';
import { tr } from '../../i18n';

function Bars() {
  const ref = useRef<HTMLDivElement>(null);
  const status = useSyncExternalStore(radio.subscribe, () => radio.getSnapshot().status);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const bars = [...el.children] as HTMLElement[];
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const draw = () => {
      const lv = radio.levels(bars.length);
      bars.forEach((b, i) => {
        const v = status === 'sonando' ? (still ? 0.35 : Math.min(1, Math.pow(lv[i], 2.6) * 1.5)) : 0.08;
        b.style.transform = `scaleY(${0.1 + v * 0.9})`;
      });
      if (!still && status === 'sonando') raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [status]);
  return (
    <div className="radio__bars" ref={ref} aria-hidden="true">
      {Array.from({ length: 14 }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}

const MESSAGES: Record<string, string> = {
  detenida: tr('en pausa', 'paused'),
  cargando: tr('cargando la pista...', 'loading the track...'),
  sonando: tr('reproduciendo', 'playing'),
  interrumpida: tr('interrumpida por el navegador', 'interrupted by the browser'),
  error: tr('sin audio', 'no audio'),
};

/** aplicación de radio del teléfono: emisoras generativas, ambientes y volumen. */
export function RadioApp() {
  const s = useSyncExternalStore(radio.subscribe, radio.getSnapshot);
  const playing = s.status === 'sonando' || s.status === 'cargando';

  useEffect(() => {
    void radio.checkPersonal();
  }, []);

  const stations: Array<{ id: StationId; name: string }> = [...STATIONS.map((st) => ({ id: st.id as StationId, name: st.name })), ...(s.personalAvailable ? [{ id: 'personal' as StationId, name: tr('personal', 'personal') }] : [])];

  return (
    <div className="radio">
      <div className="radio__now">
        <p className="radio__station">emisora {s.stationName}</p>
        <h3 className="radio__title">{s.title}</h3>
        <p className="radio__author">{s.author}</p>
        <Bars />
      </div>

      <div className="radio__stations" role="radiogroup" aria-label={tr('emisora', 'station')}>
        {stations.map((st) => (
          <button key={st.id} type="button" role="radio" aria-checked={s.station === st.id} className="radio__chip" onClick={() => void radio.setStation(st.id)}>
            {st.name}
          </button>
        ))}
      </div>

      <div className="radio__transport">
        <button type="button" className="radio__round" aria-label={tr('pista anterior', 'previous track')} disabled={s.trackCount < 2} onClick={() => void radio.prev()}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 5v14l-9-7zM6 5v14" />
          </svg>
        </button>
        <button type="button" className="radio__round radio__round--main" aria-label={playing ? tr('pausar', 'pause') : tr('reproducir', 'play')} onClick={() => void radio.toggle()}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {playing ? <path d="M8 5v14M16 5v14" /> : <path d="M8 5l11 7-11 7z" />}
          </svg>
        </button>
        <button type="button" className="radio__round" aria-label={tr('pista siguiente', 'next track')} disabled={s.trackCount < 2} onClick={() => void radio.next()}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 5v14l9-7zM18 5v14" />
          </svg>
        </button>
      </div>
      <p className="radio__count" aria-hidden="true">
        {tr('pista', 'track')} {s.trackIndex + 1} {tr('de', 'of')} {s.trackCount}
      </p>

      <label className="radio__slider">
        <span>{tr('volumen', 'volume')}</span>
        <input type="range" min={0} max={1} step={0.05} value={s.volume} onChange={(e) => radio.setVolume(Number(e.target.value))} />
      </label>

      <div className="radio__amb" role="group" aria-label={tr('sonidos de ambiente', 'ambient sounds')}>
        {AMBIENCE_IDS.map((id) => (
          <button key={id} type="button" className="radio__chip" aria-pressed={s.ambience[id]} onClick={() => radio.setAmbience(id, !s.ambience[id])}>
            {AMBIENCE_LABELS[id]}
          </button>
        ))}
      </div>
      <label className="radio__slider">
        <span>{tr('nivel del ambiente', 'ambience level')}</span>
        <input type="range" min={0} max={1} step={0.05} value={s.ambienceLevel} onChange={(e) => radio.setAmbienceLevel(Number(e.target.value))} />
      </label>

      <p className="radio__status" role="status" aria-live="polite">
        {s.message ?? MESSAGES[s.status]}
      </p>
      {s.note && <p className="radio__note">{s.note}</p>}
    </div>
  );
}
