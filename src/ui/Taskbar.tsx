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
import { tr, lang, setLang } from '../i18n';

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
  const who = loggedIn ? (session.username ? `@${session.username}` : session.email ?? tr('sesión iniciada', 'signed in')) : tr('invitado', 'guest');
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
    <div className="start-menu" role="menu" aria-label={tr('menú de inicio', 'start menu')}>
      <header className="start-menu__head">
        <span className="start-menu__avatar" aria-hidden="true">
          <AvatarImg crop="cabeza" />
        </span>
        <span className="start-menu__who">
          <strong>{who}</strong>
          <small>{loggedIn ? tr('sesión iniciada', 'signed in') : tr('jugando en este dispositivo', 'playing on this device')}</small>
        </span>
        <FlagBadge code={country} width={34} />
      </header>
      <div className="start-menu__cols">
        <div className="start-menu__list">
          {link('isla', 'isla', tr('mi isla', 'my island'), tr('decorar y jugar', 'decorate and play'))}
          {link('mundo', 'mundo', tr('mundo', 'world'), tr('el planeta y las islas', 'the planet and its islands'), () => {
            if (current === 'isla') prepareFromIsland(minePosition(countryStore.get()));
          })}
          {link('personaje', 'personaje', tr('mi personaje', 'my character'), tr('cara, pelo y ropa', 'face, hair and clothes'))}
          {link('explorar', 'explorar', tr('explorar', 'explore'), tr('islas de la comunidad', 'community islands'))}
          {link('ranking', 'info', 'ranking', tr('top 100 de jugadores', 'top 100 players'))}
          {link('inicio', 'inicio', tr('bienvenida', 'welcome'), tr('pantalla de inicio', 'home screen'))}
          {link('introduccion', 'info', tr('cómo se juega', 'how to play'), tr('introducción', 'introduction'))}
        </div>
        <div className="start-menu__side">
          <button type="button" role="menuitemcheckbox" aria-checked={state === 'sonando'} disabled={state === 'sin-pista'} className="start-menu__toggle" onClick={() => void music.toggle()}>
            {state === 'sin-pista' ? tr('música no disponible', 'music unavailable') : state === 'sonando' ? tr('pausar música', 'pause music') : tr('reproducir música', 'play music')}
          </button>
          <label className="start-menu__vol">
            <span>{tr('volumen', 'volume')}</span>
            <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => music.setVolume(Number(e.target.value))} />
          </label>
          <button type="button" role="menuitemcheckbox" aria-checked={sounds} className="start-menu__toggle" onClick={() => sfx.setEnabled(!sounds)}>
            {sounds ? tr('silenciar efectos', 'mute effects') : tr('activar efectos', 'turn effects on')}
          </button>
          <p className="start-menu__note">{loggedIn ? tr('tu isla se guarda en tu cuenta', 'your island is saved to your account') : tr('tu isla se guarda en este dispositivo', 'your island is saved on this device')}</p>
          <button type="button" role="menuitem" className="start-menu__toggle" lang={lang === 'es' ? 'en' : 'es'} onClick={() => setLang(lang === 'es' ? 'en' : 'es')}>{lang === 'es' ? 'English' : 'Español'}</button>
        </div>
      </div>
      <footer className="start-menu__foot">
        <a role="menuitem" className="start-menu__btn" href={routeHref('auth')} onClick={onClose}>
          {loggedIn ? tr('mi cuenta', 'my account') : tr('entrar o crear cuenta', 'sign in or sign up')}
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
            {tr('cerrar sesión', 'sign out')}
          </button>
        ) : (
          <a role="menuitem" className="start-menu__btn" href={routeHref('explorar')} onClick={onClose}>
            {tr('ver islas', 'see islands')}
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
      <button type="button" className={`start-orb${open ? ' is-open' : ''}`} aria-label={tr('menú de inicio', 'start menu')} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
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
        <button type="button" className="tray-btn tray-btn--phone" aria-label={tr('teléfono', 'phone')} aria-haspopup="dialog" aria-expanded={phone} onClick={() => setPhone((v) => !v)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="7" y="2.500" width="10" height="19" rx="2.500" />
            <path d="M9.500 6h5M9.500 15.500h5M9.500 18h5" />
          </svg>
        </button>
        <button type="button" className="tray-btn" aria-label={state === 'sonando' ? tr('pausar música', 'pause music') : tr('reproducir música', 'play music')} aria-pressed={state === 'sonando'} disabled={state === 'sin-pista'} onClick={() => void music.toggle()}>
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
