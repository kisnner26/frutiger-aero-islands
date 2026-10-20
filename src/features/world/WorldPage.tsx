import { useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '../../audio/sfx';
import { islandHref, routeHref } from '../../app/useHashRoute';
import type { WorldScene } from '../../engine/WorldScene';
import { WorldView } from '../../engine/WorldView';
import { AeroWindow } from '../../ui/AeroWindow';
import { WorldCommunityPanel } from '../community/WorldCommunityPanel';
import { GadgetsPanel } from '../community/GadgetsPanel';
import { Taskbar } from '../../ui/Taskbar';
import { syncCountry } from '../../persistence/country';
import { isSupabaseConfigured, myIsland } from '../../persistence/supabase';
import { listWorldIslands, type RealIsland } from '../../persistence/world';
import { buildArchipelago, loadMine } from '../../world/archipelago';
import { findCountry } from '../../world/countries';
import { countryStore, useCountry } from '../../world/country';
import { CountryGate } from '../../world/CountryPicker';
import { FlagBadge } from '../../world/FlagBadge';
import { loadWorldView, saveWorldView, type WorldView as ViewState } from '../../world/worldState';

/** mundo: planeta lejano, transición a su océano interior y selección de islas. */
export function WorldPage() {
  const mine = useRef(loadMine());
  const [remoteMine, setRemoteMine] = useState(false);
  const [mineTick, setMineTick] = useState(0);
  const [others, setOthers] = useState<RealIsland[]>([]);
  const [loaded, setLoaded] = useState(!isSupabaseConfigured);
  const country = useCountry();
  const sceneRef = useRef<WorldScene | null>(null);
  const initial = useRef<ViewState | null>(null);
  const prevCountry = useRef(country);
  const islands = useMemo(() => {
    const list = buildArchipelago(mine.current, others, country);
    if (prevCountry.current !== country) {
      // al cambiar de país la vista se recentra en la nueva zona de mi isla
      const me = list.find((i) => i.id === 'mia');
      if (me) initial.current = { mode: sceneRef.current?.mode ?? 'lejos', cx: me.x, cy: me.y, zoom: 1.1, selectedId: 'mia' };
      prevCountry.current = country;
    }
    return list;
  }, [country, mineTick, others]);
  if (initial.current === null) {
    const saved = loadWorldView();
    const me = buildArchipelago(mine.current, [], countryStore.get()).find((i) => i.id === 'mia');
    initial.current = saved ?? { mode: 'lejos', cx: me?.x ?? 0, cy: me?.y ?? 0, zoom: 1, selectedId: null };
  }
  const [changeCountry, setChangeCountry] = useState(false);
  useEffect(() => {
    void syncCountry();
    if (!isSupabaseConfigured) return;
    let alive = true;
    // con cuenta, mi isla en el mundo es la guardada en la nube, no el borrador del dispositivo
    let myName: string | null = null;
    const mineDone = myIsland()
      .then((i) => {
        if (!alive || !i) return;
        myName = i.username;
        mine.current = { objects: i.layout.objects, level: i.layout.maxLevel };
        setRemoteMine(true);
        setMineTick((n) => n + 1);
      })
      .catch(() => undefined);
    // solo personas registradas: las islas de otros jugadores vienen de la red, nunca se inventan
    Promise.all([listWorldIslands(), mineDone])
      .then(([list]) => alive && setOthers(list.filter((o) => o.username !== myName)))
      .catch(() => undefined)
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);
  const [mode, setMode] = useState<'lejos' | 'dentro'>(initial.current?.mode ?? 'lejos');
  const [selectedId, setSelectedId] = useState<string | null>(initial.current?.selectedId ?? null);
  const [listOpen, setListOpen] = useState(false);
  const [expOpen, setExpOpen] = useState(false);
  const [gadgetsOpen, setGadgetsOpen] = useState(false);
  const selected = islands.find((i) => i.id === selectedId) ?? null;
  const firstCountry = useRef(true);
  useEffect(() => {
    if (firstCountry.current) {
      firstCountry.current = false;
      return;
    }
    setSelectedId('mia');
  }, [country]);

  const callbacks = useMemo(
    () => ({
      onSelect: (id: string | null) => setSelectedId(id),
      onView: (v: ViewState) => saveWorldView(v),
      onMode: (m: 'lejos' | 'dentro') => setMode(m),
    }),
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA')) return;
      const sc = sceneRef.current;
      if (!sc) return;
      if (e.key === 'Escape') {
        if (selectedId) {
          sc.select(null);
          setSelectedId(null);
        } else if (mode === 'dentro') sc.leave();
        return;
      }
      if (mode !== 'dentro') return;
      const step = 60;
      if (e.key === 'ArrowLeft') sc.pan(-step, 0);
      else if (e.key === 'ArrowRight') sc.pan(step, 0);
      else if (e.key === 'ArrowUp') sc.pan(0, -step);
      else if (e.key === 'ArrowDown') sc.pan(0, step);
      else if (e.key === '+' || e.key === '=') sc.zoomBy(1.2);
      else if (e.key === '-') sc.zoomBy(1 / 1.2);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, selectedId]);

  const choose = (id: string) => {
    sfx.click();
    const sc = sceneRef.current;
    if (!sc) return;
    if (sc.mode === 'lejos') sc.enter();
    sc.select(id);
    setSelectedId(id);
    sc.focus(id);
  };

  const status = mode === 'lejos' ? 'vista lejana del planeta' : 'dentro del planeta, archipiélago interior';

  return (
    <div className="game world">
      <WorldView islands={islands} initial={initial.current} callbacks={callbacks} controlRef={sceneRef} />

      <header className="world-hud">
        <div className="glass-panel world-hud__bar">
          {mode === 'dentro' ? (
            <button type="button" className="world-hud__back" onClick={() => sceneRef.current?.leave()}>
              ‹ alejar
            </button>
          ) : (
            <a className="world-hud__back" href={routeHref('inicio')}>
              ‹ inicio
            </a>
          )}
          <strong>mundo</strong>
          <span className="world-hud__hint">{mode === 'lejos' ? 'toca el planeta para entrar' : 'arrastra para moverte y toca una isla'}</span>
        </div>
        {loaded && (
          <p className="world-hud__note">
            {others.length === 0 ? 'aún no hay otros exploradores. comparte el enlace y sé de los primeros.' : `${others.length + 1} islas de jugadores reales`}
          </p>
        )}
      </header>

      {mode === 'lejos' && (
        <div className="world-enter">
          <button type="button" className="vista-button vista-button--primary" onClick={() => sceneRef.current?.enter()}>
            entrar al planeta
          </button>
        </div>
      )}

      {listOpen && (
        <AeroWindow className="win-world-list" title="islas del mundo" icon={<span className="mini-orb mini-orb--green" />} onClose={() => setListOpen(false)}>
          <ul className="island-list" aria-label="islas">
            {islands.map((i) => (
              <li key={i.id}>
                <button type="button" aria-pressed={i.id === selectedId} onClick={() => choose(i.id)}>
                  <strong>{i.name}</strong>
                  <small>{i.kind === 'mia' ? (remoteMine ? 'tuya, guardada en tu cuenta' : 'tuya, guardada en este dispositivo') : `@${i.username}`}</small>
                </button>
              </li>
            ))}
          </ul>
        </AeroWindow>
      )}

      {expOpen && (
        <AeroWindow className="win-world-list" title="expediciones" icon={<span className="mini-orb" />} onClose={() => setExpOpen(false)}>
          <WorldCommunityPanel />
        </AeroWindow>
      )}
      {gadgetsOpen && (
        <AeroWindow className="win-world-list" title="gadgets" icon={<span className="mini-orb mini-orb--green" />} onClose={() => setGadgetsOpen(false)}>
          <GadgetsPanel level={mine.current.level} />
        </AeroWindow>
      )}

      {selected && mode === 'dentro' && (
        <AeroWindow className="win-world-card" title={selected.name} icon={<span className="mini-orb" />} onClose={() => sceneRef.current?.select(null)}>
          <div className="world-card">
            {selected.kind === 'mia' ? (
              <>
                <p>
                  {selected.objects.length} objetos · nivel {selected.level} · {remoteMine ? 'guardada en tu cuenta' : 'guardada en este dispositivo'}
                </p>
                <p className="world-card__zone">
                  <FlagBadge code={selected.country} width={34} />
                  {findCountry(selected.country) ? `zona: ${findCountry(selected.country)!.name}` : 'zona: mar abierto, aún sin país'}{' '}
                  <button type="button" className="text-link" onClick={() => setChangeCountry(true)}>
                    {selected.country ? 'cambiar país' : 'elegir país'}
                  </button>
                </p>
                <a className="vista-button vista-button--primary" href={routeHref('isla')}>
                  entrar a mi isla
                </a>
              </>
            ) : (
              <>
                <p>
                  {selected.objects.length} objetos · nivel {selected.level}
                </p>
                <p className="world-card__zone">
                  <FlagBadge code={selected.country} width={34} />
                  {findCountry(selected.country) ? `zona: ${findCountry(selected.country)!.name}` : 'zona: mar abierto'}
                </p>
                <a className="vista-button vista-button--primary" href={islandHref(selected.username!)}>
                  visitar
                </a>
              </>
            )}
          </div>
        </AeroWindow>
      )}

      <CountryGate forceOpen={changeCountry} onClose={() => setChangeCountry(false)} />
      <span className="sr-only" role="status" aria-live="polite">
        {status}
        {selected ? `, seleccionada: ${selected.name}` : ''}
      </span>

      <Taskbar tasks={[{ id: 'islas', label: 'islas', icon: <span className="mini-orb mini-orb--green" />, active: listOpen, onClick: () => setListOpen((v) => !v) },
        ...(isSupabaseConfigured ? [{ id: 'exp', label: 'expediciones', icon: <span className="mini-orb" />, active: expOpen, onClick: () => setExpOpen((v) => !v) }, { id: 'gadgets', label: 'gadgets', icon: <span className="mini-orb mini-orb--green" />, active: gadgetsOpen, onClick: () => setGadgetsOpen((v) => !v) }] : [])]} />
    </div>
  );
}
