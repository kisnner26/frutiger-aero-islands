import { useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '../../audio/sfx';
import { routeHref } from '../../app/useHashRoute';
import type { WorldScene } from '../../engine/WorldScene';
import { WorldView } from '../../engine/WorldView';
import { AeroWindow } from '../../ui/AeroWindow';
import { Taskbar } from '../../ui/Taskbar';
import { buildArchipelago, loadMine } from '../../world/archipelago';
import { loadWorldView, saveWorldView, type WorldView as ViewState } from '../../world/worldState';

/** mundo: planeta lejano, transición a su océano interior y selección de islas. */
export function WorldPage() {
  const mine = useRef(loadMine());
  const islands = useMemo(() => buildArchipelago(mine.current), []);
  const initial = useRef<ViewState | null>(loadWorldView());
  const sceneRef = useRef<WorldScene | null>(null);
  const [mode, setMode] = useState<'lejos' | 'dentro'>(initial.current?.mode ?? 'lejos');
  const [selectedId, setSelectedId] = useState<string | null>(initial.current?.selectedId ?? null);
  const [listOpen, setListOpen] = useState(false);
  const selected = islands.find((i) => i.id === selectedId) ?? null;

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
        <p className="world-hud__note">las islas de ejemplo son dibujos del prototipo, no jugadores.</p>
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
                  <small>{i.kind === 'mia' ? 'tuya, guardada en este dispositivo' : 'ejemplo del prototipo'}</small>
                </button>
              </li>
            ))}
          </ul>
        </AeroWindow>
      )}

      {selected && mode === 'dentro' && (
        <AeroWindow className="win-world-card" title={selected.name} icon={<span className="mini-orb" />} onClose={() => sceneRef.current?.select(null)}>
          <div className="world-card">
            {selected.kind === 'mia' ? (
              <>
                <p>
                  {selected.objects.length} objetos · nivel {selected.level} · guardada en este dispositivo
                </p>
                <a className="vista-button vista-button--primary" href={routeHref('isla')}>
                  entrar a mi isla
                </a>
              </>
            ) : (
              <p>dibujo del prototipo para evaluar la composición del archipiélago. no pertenece a ningún jugador.</p>
            )}
          </div>
        </AeroWindow>
      )}

      <span className="sr-only" role="status" aria-live="polite">
        {status}
        {selected ? `, seleccionada: ${selected.name}` : ''}
      </span>

      <Taskbar tasks={[{ id: 'islas', label: 'islas', icon: <span className="mini-orb mini-orb--green" />, active: listOpen, onClick: () => setListOpen((v) => !v) }]} />
    </div>
  );
}
