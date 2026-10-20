import { lazy, Suspense, useEffect, useRef } from 'react';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { Backdrop } from '../scene/Backdrop';
import { AeroWindow } from '../ui/AeroWindow';
import { Taskbar } from '../ui/Taskbar';
import { routeHref, useHashRoute, type Route } from './useHashRoute';
import { AuthPage } from '../features/community/AuthPage';
import { ExplorePage } from '../features/community/ExplorePage';
import { MyIslandPage, VisitIslandPage } from '../features/community/IslandPages';

const TITULOS: Record<Route, string> = {
  inicio: 'frutiger aero islands',
  introduccion: 'cómo se juega | frutiger aero islands',
  mundo: 'mundo | frutiger aero islands',
  isla: 'tu isla | frutiger aero islands',
  auth: 'cuenta | frutiger aero islands',
  explorar: 'explorar | frutiger aero islands',
  visita: 'visita | frutiger aero islands',
};

const WorldPage = lazy(() => import('../features/world/WorldPage').then((m) => ({ default: m.WorldPage })));

function Channel({ href, label, hint, tone, onClick }: { href: string; label: string; hint: string; tone: 'isla' | 'info' | 'inicio' | 'mundo'; onClick?: () => void }) {
  return (
    <a className={`channel channel--${tone}`} href={href} onClick={onClick}>
      <span className="channel__art" aria-hidden="true">
        <span className="channel__glyph" />
      </span>
      <span className="channel__label">{label}</span>
      <span className="channel__hint">{hint}</span>
    </a>
  );
}

function Inicio() {
  const play = () => {
    sfx.click();
    if (music.wantsMusic()) void music.play();
  };
  return (
    <AeroWindow className="win-welcome" title="bienvenido a frutiger aero islands" icon={<span className="mini-orb" />}>
      <div className="welcome">
        <p className="eyebrow">una isla de vidrio y agua</p>
        <h1 id="titulo-vista" className="welcome__title" tabIndex={-1} data-vista-titulo>
          frutiger aero islands
        </h1>
        <p className="lead">decora tu propia isla con palmeras, cristales y pabellones sobre un lago luminoso. revienta burbujas, atrapa peces saltarines y sube de nivel.</p>
        <nav className="channels" aria-label="canales">
          <Channel href={routeHref('isla')} label="mi isla" hint="jugar ahora" tone="isla" onClick={play} />
          <Channel href={routeHref('mundo')} label="mundo" hint="ver el planeta" tone="mundo" />
          <Channel href={routeHref('explorar')} label="explorar" hint="ver islas" tone="info" />
          <Channel href={routeHref('auth')} label="cuenta" hint="entrar" tone="inicio" />
          <Channel href={routeHref('introduccion')} label="cómo se juega" hint="introducción" tone="info" />
        </nav>
        <p className="welcome__note">modo local: tu isla se guarda en este dispositivo.</p>
      </div>
    </AeroWindow>
  );
}

function Introduccion() {
  const play = () => {
    sfx.click();
    if (music.wantsMusic()) void music.play();
  };
  return (
    <AeroWindow className="win-welcome" title="cómo se juega" icon={<span className="mini-orb mini-orb--green" />}>
      <div className="welcome">
        <h1 id="titulo-vista" className="welcome__title welcome__title--sm" tabIndex={-1} data-vista-titulo>
          así funciona tu isla
        </h1>
        <ol className="steps">
          <li>
            <strong>gana brillos.</strong> revienta burbujas (las doradas valen más), atrapa la mariposa y el pez que salta.
          </li>
          <li>
            <strong>decora.</strong> compra palmeras, árboles, flores, rocas, cristales, fuentes, pabellones y peces; muévelos, gíralos y cambia su tamaño.
          </li>
          <li>
            <strong>sube de nivel.</strong> la variedad y la armonía entre objetos cercanos suben el encanto; cada nivel desbloquea decoraciones nuevas.
          </li>
        </ol>
        <ul className="status-list">
          <li>
            <span className="status-list__tag">listo</span>
            <span>isla jugable, editor y guardado en este dispositivo</span>
          </li>
          <li>
            <span className="status-list__tag status-list__tag--pendiente">pendiente</span>
            <span>cuentas, guardado en la nube y visitas entre islas</span>
          </li>
        </ul>
        <nav className="channels" aria-label="canales">
          <Channel href={routeHref('isla')} label="mi isla" hint="jugar ahora" tone="isla" onClick={play} />
          <Channel href={routeHref('inicio')} label="bienvenida" hint="volver" tone="inicio" />
        </nav>
      </div>
    </AeroWindow>
  );
}

export function App() {
  const routeState = useHashRoute();
  const route = routeState.route;
  const primera = useRef(true);

  useEffect(() => music.armFirstGesture(), []);

  useEffect(() => {
    document.title = TITULOS[route];
    if (primera.current) {
      primera.current = false;
      return;
    }
    document.querySelector<HTMLElement>('[data-vista-titulo]')?.focus();
  }, [route]);

  if (route === 'auth') return <div className="app"><Backdrop /><main className="main"><AuthPage /></main><Taskbar /></div>;
  if (route === 'explorar') return <div className="app"><Backdrop /><main className="main"><ExplorePage /></main><Taskbar /></div>;
  if (route === 'visita' && routeState.username) return <VisitIslandPage username={routeState.username} />;
  if (route === 'mundo') {
    return (
      <Suspense fallback={<p className="scene-view__msg" role="status">preparando el mundo...</p>}>
        <WorldPage />
      </Suspense>
    );
  }

  if (route === 'isla') {
    return (
      <Suspense fallback={<p className="scene-view__msg" role="status">cargando la isla...</p>}>
        <MyIslandPage />
      </Suspense>
    );
  }

  return (
    <div className="app">
      <Backdrop />
      <main className="main">{route === 'inicio' ? <Inicio /> : <Introduccion />}</main>
      <Taskbar />
    </div>
  );
}
