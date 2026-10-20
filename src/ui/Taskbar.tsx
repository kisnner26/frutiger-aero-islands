import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { parseHash, routeHref } from '../app/useHashRoute';
import { signOut, useSession } from '../persistence/session';
import { minePosition } from '../world/archipelago';
import { countryStore, useCountry } from '../world/country';
import { FlagBadge } from '../world/FlagBadge';
import { AvatarImg } from '../avatar/AvatarFace';
import { prepareFromIsland } from '../world/worldState';
import { phoneBus, type PhoneApp } from '../features/phone/phoneBus';

const PhonePanel = lazy(() => import('../features/phone/PhonePanel'));

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
  const session = useSession();
  const country = useCountry();
  const current = parseHash(window.location.hash).route;
  const loggedIn = session.status === 'con-sesion';
  const who = loggedIn ? (session.username ? `@${session.username}` : session.email ?? 'sesión iniciada') : 'invitado';
  const link = (route: 'isla' | 'mundo' | 'explorar' | 'inicio' | 'introduccion' | 'personaje' | 'ranking', ico: string, title: string, hint: string, onClick?: () => void) => (
    <a role="menuitem" className="start-menu__item" href={routeHref(route)} aria-current={current === route ? 'page' : undefined} onClick={() => { onClick?.(); onClose(); }}>
      <span className={`start-menu__ico start-menu__ico--${ico}`} aria-hidden="true" />
      <span>
        <strong>{title}</strong>
        <small>{hint}</small>
      </span>
    </a>
  );
  return (
    <div className="start-menu" role="menu" aria-label="menú de inicio">
      <header className="start-menu__head">
        <span className="start-menu__avatar" aria-hidden="true">
          <AvatarImg crop="cabeza" />
        </span>
        <span className="start-menu__who">
          <strong>{who}</strong>
          <small>{loggedIn ? 'sesión iniciada' : 'jugando en este dispositivo'}</small>
        </span>
        <FlagBadge code={country} width={34} />
      </header>
      <div className="start-menu__cols">
        <div className="start-menu__list">
          {link('isla', 'isla', 'mi isla', 'decorar y jugar')}
          {link('mundo', 'mundo', 'mundo', 'el planeta y las islas', () => {
            if (current === 'isla') prepareFromIsland(minePosition(countryStore.get()));
          })}
          {link('personaje', 'personaje', 'mi personaje', 'cara, pelo y ropa')}
          {link('explorar', 'explorar', 'explorar', 'islas de la comunidad')}
          {link('ranking', 'info', 'ranking', 'top 100 de jugadores')}
          {link('inicio', 'inicio', 'bienvenida', 'pantalla de inicio')}
          {link('introduccion', 'info', 'cómo se juega', 'introducción')}
        </div>
        <div className="start-menu__side">
          <button type="button" role="menuitemcheckbox" aria-checked={state === 'sonando'} disabled={state === 'sin-pista'} className="start-menu__toggle" onClick={() => void music.toggle()}>
            {state === 'sin-pista' ? 'música no disponible' : state === 'sonando' ? 'pausar música' : 'reproducir música'}
          </button>
          <label className="start-menu__vol">
            <span>volumen</span>
            <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => music.setVolume(Number(e.target.value))} />
          </label>
          <button type="button" role="menuitemcheckbox" aria-checked={sounds} className="start-menu__toggle" onClick={() => sfx.setEnabled(!sounds)}>
            {sounds ? 'silenciar efectos' : 'activar efectos'}
          </button>
          <p className="start-menu__note">{loggedIn ? 'tu isla se guarda en tu cuenta' : 'tu isla se guarda en este dispositivo'}</p>
        </div>
      </div>
      <footer className="start-menu__foot">
        <a role="menuitem" className="start-menu__btn" href={routeHref('auth')} onClick={onClose}>
          {loggedIn ? 'mi cuenta' : 'entrar o crear cuenta'}
        </a>
        {loggedIn ? (
          <button
            type="button"
            role="menuitem"
            className="start-menu__btn"
            onClick={() => {
              onClose();
              void signOut().then(() => {
                window.location.hash = routeHref('inicio');
              });
            }}
          >
            cerrar sesión
          </button>
        ) : (
          <a role="menuitem" className="start-menu__btn" href={routeHref('explorar')} onClick={onClose}>
            ver islas
          </a>
        )}
      </footer>
    </div>
  );
}

interface Props {
  tasks?: TaskItem[];
}

/** barra de tareas de cristal con orbe de inicio, ventanas abiertas y bandeja. */
export function Taskbar({ tasks = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(false);
  const [phoneApp, setPhoneApp] = useState<PhoneApp>('inicio');
  const requestedPhoneApp = useSyncExternalStore(phoneBus.subscribe, phoneBus.phoneApp);
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

  useEffect(() => {
    if (!requestedPhoneApp) return;
    setPhoneApp(requestedPhoneApp);
    setPhone(true);
    phoneBus.consumeOpen();
  }, [requestedPhoneApp]);

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
      {phone && (
        <Suspense fallback={null}>
          <PhonePanel onClose={() => setPhone(false)} initialApp={phoneApp} />
        </Suspense>
      )}
      <div className="taskbar__tray">
        <button type="button" className="tray-btn tray-btn--phone" aria-label="teléfono" aria-haspopup="dialog" aria-expanded={phone} onClick={() => setPhone((v) => !v)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="7" y="2.500" width="10" height="19" rx="2.500" />
            <path d="M9.500 6h5M9.500 15.500h5M9.500 18h5" />
          </svg>
        </button>
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
