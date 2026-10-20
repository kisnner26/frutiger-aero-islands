import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { parseHash, routeHref } from '../app/useHashRoute';
import { MINE_POS } from '../world/archipelago';
import { prepareFromIsland } from '../world/worldState';

export interface TaskItem {
  id: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(t);
  }, []);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return (
    <time className="taskbar__clock" dateTime={`${hh}:${mm}`}>
      {hh}:{mm}
    </time>
  );
}

function StartMenu({ onClose }: { onClose: () => void }) {
  const state = useSyncExternalStore(music.subscribe, music.getState);
  const volume = useSyncExternalStore(music.subscribe, music.getVolume);
  const sounds = useSyncExternalStore(sfx.subscribe, sfx.isEnabled);
  return (
    <div className="start-menu" role="menu" aria-label="menú de inicio">
      <div className="start-menu__list">
        <a role="menuitem" className="start-menu__item" href={routeHref('isla')} onClick={onClose}>
          <span className="start-menu__ico start-menu__ico--isla" aria-hidden="true" />
          <span>
            <strong>mi isla</strong>
            <small>decorar y jugar</small>
          </span>
        </a>
        <a
          role="menuitem"
          className="start-menu__item"
          href={routeHref('mundo')}
          onClick={() => {
            if (parseHash(window.location.hash).route === 'isla') prepareFromIsland(MINE_POS);
            onClose();
          }}
        >
          <span className="start-menu__ico start-menu__ico--mundo" aria-hidden="true" />
          <span>
            <strong>mundo</strong>
            <small>ver el planeta y las islas</small>
          </span>
        </a>
        <a role="menuitem" className="start-menu__item" href={routeHref('inicio')} onClick={onClose}>
          <span className="start-menu__ico start-menu__ico--inicio" aria-hidden="true" />
          <span>
            <strong>bienvenida</strong>
            <small>pantalla de inicio</small>
          </span>
        </a>
        <a role="menuitem" className="start-menu__item" href={routeHref('introduccion')} onClick={onClose}>
          <span className="start-menu__ico start-menu__ico--info" aria-hidden="true" />
          <span>
            <strong>cómo se juega</strong>
            <small>introducción</small>
          </span>
        </a>
      </div>
      <div className="start-menu__side">
        <button type="button" role="menuitemcheckbox" aria-checked={state === 'sonando'} disabled={state === 'sin-pista'} className="start-menu__toggle" onClick={() => void music.toggle()}>
          {state === 'sin-pista' ? 'música: pista no disponible' : state === 'sonando' ? 'pausar música' : 'reproducir música'}
        </button>
        <label className="start-menu__vol">
          <span>volumen</span>
          <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => music.setVolume(Number(e.target.value))} />
        </label>
        <button type="button" role="menuitemcheckbox" aria-checked={sounds} className="start-menu__toggle" onClick={() => sfx.setEnabled(!sounds)}>
          {sounds ? 'silenciar efectos' : 'activar efectos'}
        </button>
        <p className="start-menu__note">tu isla se guarda en este dispositivo</p>
      </div>
    </div>
  );
}

interface Props {
  tasks?: TaskItem[];
}

/** barra de tareas de cristal con orbe de inicio, ventanas abiertas y bandeja. */
export function Taskbar({ tasks = [] }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const state = useSyncExternalStore(music.subscribe, music.getState);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  return (
    <div className="taskbar" ref={ref}>
      {open && <StartMenu onClose={() => setOpen(false)} />}
      <button type="button" className={`start-orb${open ? ' is-open' : ''}`} aria-label="menú de inicio" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="M16 6c-1.2 3-2.4 5-5 6 2 .6 3.4 1.600 4 3.600.6-2 2-3 4-3.600-2.600-1-3.800-3-3-6z" />
          <path d="M6 24c3-2 6-2 10 0s7 2 10 0" />
        </svg>
      </button>
      <div className="taskbar__tasks">
        {tasks.map((t) => (
          <button key={t.id} type="button" className={`task${t.active ? ' is-active' : ''}`} aria-pressed={t.active} onClick={t.onClick}>
            <span className="task__ico" aria-hidden="true">
              {t.icon}
            </span>
            <span className="task__label">{t.label}</span>
          </button>
        ))}
      </div>
      <div className="taskbar__tray">
        <button type="button" className="tray-btn" aria-label={state === 'sonando' ? 'pausar música' : 'reproducir música'} aria-pressed={state === 'sonando'} disabled={state === 'sin-pista'} onClick={() => void music.toggle()}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9H4z" />
            {state === 'sonando' && <path d="M16 8.500a5 5 0 010 7M18.500 6a8.500 8.500 0 010 12" />}
          </svg>
        </button>
        <Clock />
      </div>
    </div>
  );
}
