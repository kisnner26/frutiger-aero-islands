import { lazy, Suspense, useEffect, useRef, type ReactNode } from 'react';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { Backdrop } from '../scene/Backdrop';
import { AeroWindow } from '../ui/AeroWindow';
import { Taskbar } from '../ui/Taskbar';
import { routeHref, useHashRoute, type Route } from './useHashRoute';
import { AuthPage } from '../features/community/AuthPage';
import { AccountPanel } from '../features/community/AccountPanel';
import { useSession } from '../persistence/session';
import { sceneBridge } from '../engine/sceneBridge';
import { Veil } from '../ui/Veil';
import { AeroLoader } from '../ui/AeroLoader';
import { veil } from '../ui/veilStore';

const TITULOS: Record<Route, string> = {
  inicio: 'frutiger aero islands',
  introduccion: 'cómo se juega | frutiger aero islands',
  mundo: 'mundo | frutiger aero islands',
  personaje: 'mi personaje | frutiger aero islands',
  arcade: 'arcade | frutiger aero islands',
  isla: 'tu isla | frutiger aero islands',
  auth: 'cuenta | frutiger aero islands',
  explorar: 'explorar | frutiger aero islands',
  visita: 'visita | frutiger aero islands',
};

/** la cuenta muestra el formulario solo si no hay sesión; con sesión muestra la cuenta. */
function Cuenta() {
  const session = useSession();
  if (session.status === 'cargando') return <AeroLoader variant="page" text="comprobando tu sesión..." detail="verificando la llave de tu archipiélago..." />;
  return session.status === 'con-sesion' ? <AccountPanel session={session} /> : <AuthPage />;
}

const WorldPage = lazy(() => import('../features/world/WorldPage').then((m) => ({ default: m.WorldPage })));
const ArcadePage = lazy(() => import('../features/arcade/ArcadePage').then((m) => ({ default: m.ArcadePage })));
const AvatarEditor = lazy(() => import('../features/avatar/AvatarEditor').then((m) => ({ default: m.AvatarEditor })));
const ExplorePage = lazy(() => import('../features/community/ExplorePage').then((m) => ({ default: m.ExplorePage })));
const MyIslandPage = lazy(() => import('../features/community/IslandPages').then((m) => ({ default: m.MyIslandPage })));
const VisitIslandPage = lazy(() => import('../features/community/IslandPages').then((m) => ({ default: m.VisitIslandPage })));
const LoadingRoute = ({ text }: { text: string }) => <AeroLoader variant="page" text={text} />;

function Inicio() {
  const session = useSession();
  if (session.status === 'cargando') return <div className="app"><Backdrop /><main className="main"><AeroLoader text="preparando tu archipiélago..." detail="la marea está conectando tu cuenta..." /></main></div>;
  const signed = session.status === 'con-sesion';
  return (
    <div className={`landing${signed ? ' landing--member' : ''}`}>
      <div className="landing__sky" aria-hidden="true"><i /><i /><i /></div>
      <header className="landing__bar">
        <p className="landing__eyebrow">frutiger aero islands</p>
        <aside className="landing__signal" aria-label="estado de la comunidad">
          <span className="landing__dot" aria-hidden="true" />
          <strong>{signed ? 'conectado' : 'acceso protegido'}</strong>
          <small>{signed ? 'guardado en la nube' : 'inicia sesión para entrar'}</small>
        </aside>
      </header>
      <section className="landing__copy" aria-labelledby="titulo-vista">
        <h1 id="titulo-vista" tabIndex={-1} data-vista-titulo>{signed ? 'tu isla está lista.' : 'un mundo de islas, hecho por personas.'}</h1>
        <p>{signed ? `vuelve a ${session.username ? `@${session.username}` : 'tu isla'} y continúa donde lo dejaste.` : 'crea una cuenta para diseñar tu isla, guardar cada objeto y visitar a otros jugadores.'}</p>
        <nav className="landing__actions" aria-label={signed ? 'continuar jugando' : 'empezar'}>
          {signed ? <><a className="vista-button vista-button--primary" href={routeHref('isla')} onClick={() => { sfx.click(); if (music.wantsMusic()) void music.play(); }}>continuar en mi isla</a><a className="landing__text-link" href={routeHref('mundo')}>ir al mundo</a></> : <><a className="vista-button vista-button--primary" href={routeHref('auth')}>crear cuenta o entrar</a><a className="landing__text-link" href={routeHref('introduccion')}>cómo funciona</a></>}
        </nav>
      </section>
      <ul className="landing__facts" aria-label="qué incluye">
        <li><strong>en tu cuenta</strong><small>isla y avatar guardados</small></li>
        <li><strong>visitas públicas</strong><small>otros te encuentran</small></li>
        <li><strong>sincronizado</strong><small>mismo progreso en todo</small></li>
      </ul>
    </div>
  );
}

function Introduccion() {
  const session = useSession();
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
        <p className="welcome__note">tu isla, avatar y decoraciones pertenecen a tu cuenta. cada modificación se guarda en la nube.</p>
        <nav className="intro-actions" aria-label="siguientes pasos"><a className="vista-button vista-button--primary" href={routeHref(session.status === 'con-sesion' ? 'isla' : 'auth')}>{session.status === 'con-sesion' ? 'ir a mi isla' : 'crear cuenta o entrar'}</a><a className="landing__text-link" href={routeHref('inicio')}>volver</a></nav>
      </div>
    </AeroWindow>
  );
}

function AccessGate({ children }: { children: ReactNode }) {
  const session = useSession();
  if (session.status === 'con-sesion') return <>{children}</>;
  if (session.status === 'cargando') return <AeroLoader variant="page" text="comprobando tu cuenta..." detail="abriendo una ruta segura al archipiélago..." />;
  return <div className="app"><Backdrop /><main className="main"><section className="access-gate" aria-labelledby="access-title"><span className="mini-orb" aria-hidden="true" /><p>archipiélago online</p><h1 id="access-title">entra para jugar</h1><span>tu isla, personaje y progreso están ligados a una cuenta.</span><a className="vista-button vista-button--primary" href={routeHref('auth')}>crear cuenta o entrar</a><a className="landing__text-link" href={routeHref('inicio')}>volver a la bienvenida</a></section></main></div>;
}

function Routes() {
  const routeState = useHashRoute();
  const route = routeState.route;
  const session = useSession();
  const primera = useRef(true);

  useEffect(() => music.armFirstGesture(), []);

  /* transición: velo de cristal al abrir la isla o el mundo; la escena lo retira cuando está lista */
  const prevRoute = useRef<Route | null>(null);
  useEffect(() => {
    if (session.status !== 'con-sesion') {
      veil.hide();
      return;
    }
    const before = prevRoute.current;
    prevRoute.current = route;
    if (before === route) return;
    let timer = 0;
    if (route === 'isla') {
      veil.show('abriendo tu isla');
      timer = window.setTimeout(() => !sceneBridge.get() && veil.hide(), 4000);
    } else if (route === 'mundo') {
      veil.show(before === 'isla' ? 'viajando al mundo' : 'abriendo el mundo');
    } else if (route === 'visita') {
      veil.show('visitando una isla');
      timer = window.setTimeout(() => !sceneBridge.get() && veil.hide(), 4000);
    } else if (before === 'isla' || before === 'mundo' || before === 'visita') {
      veil.show('volviendo');
      timer = window.setTimeout(() => veil.hide(), 200);
    }
    return () => window.clearTimeout(timer);
  }, [route, session.status]);

  useEffect(() => {
    document.title = TITULOS[route];
    if (primera.current) {
      primera.current = false;
      return;
    }
    document.querySelector<HTMLElement>('[data-vista-titulo]')?.focus();
  }, [route]);

  if (route === 'auth') return <div className="app"><Backdrop /><main className="main"><Cuenta /></main>{session.status === 'con-sesion' && <Taskbar />}</div>;
  if (route === 'personaje') return <AccessGate><div className="app"><Backdrop /><main className="main"><Suspense fallback={<LoadingRoute text="abriendo el personaje..." />}><AvatarEditor /></Suspense></main><Taskbar /></div></AccessGate>;
  if (route === 'arcade') return <AccessGate><Suspense fallback={<AeroLoader variant="scene" text="abriendo el arcade..." detail="preparando desafíos sobre el agua..." />}><ArcadePage onExit={() => { window.location.hash = routeHref('mundo'); }} /></Suspense></AccessGate>;
  if (route === 'explorar') return <AccessGate><div className="app"><Backdrop /><main className="main"><Suspense fallback={<LoadingRoute text="buscando islas..." />}><ExplorePage /></Suspense></main><Taskbar /></div></AccessGate>;
  if (route === 'visita' && routeState.username) return <AccessGate><Suspense fallback={<LoadingRoute text="visitando isla..." />}><VisitIslandPage username={routeState.username} /></Suspense></AccessGate>;
  if (route === 'mundo') {
    return (
      <AccessGate><Suspense fallback={<AeroLoader variant="scene" text="preparando el mundo..." detail="trazando rutas y señales del atlas..." />}><WorldPage /></Suspense></AccessGate>
    );
  }

  if (route === 'isla') {
    return (
      <AccessGate><Suspense fallback={<LoadingRoute text="cargando la isla..." />}><MyIslandPage /></Suspense></AccessGate>
    );
  }

  return (
    <div className="app">
      <Backdrop />
      <main className="main">{route === 'inicio' ? <Inicio /> : <Introduccion />}</main>
      {session.status === 'con-sesion' && <Taskbar />}
    </div>
  );
}

export function App() {
  return (
    <>
      <Routes />
      <Veil />
    </>
  );
}
