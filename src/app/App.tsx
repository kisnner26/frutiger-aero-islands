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
import { prefetchWorld } from '../persistence/prefetch';
import { everyWhileVisible } from '../persistence/fastcache';
import { touchMyPresence } from '../persistence/presence';
import { restorationStore, useRestoration } from '../world/restorationStore';
import { tr, lang, setLang } from '../i18n';
import { awardSoles } from '../persistence/soles';
import { AeroAtmosphere, Brand, EraStrip } from '../ui/Brand';

const TITULOS: Record<Route, string> = {
  inicio: 'frutiger aero islands',
  introduccion: `${tr('cómo se juega', 'how to play')} | frutiger aero islands`,
  mundo: `${tr('mundo', 'world')} | frutiger aero islands`,
  personaje: `${tr('mi personaje', 'my character')} | frutiger aero islands`,
  arcade: 'arcade | frutiger aero islands',
  reglas: `${tr('reglas y privacidad', 'rules and privacy')} | frutiger aero islands`,
  ranking: 'ranking | frutiger aero islands',
  probar: `${tr('probar sin cuenta', 'try without an account')} | frutiger aero islands`,
  royale: 'aero royale | frutiger aero islands',
  blob: 'aero blob | frutiger aero islands',
  paintball: 'paintball royale | frutiger aero islands',
  arena: 'aero arena | frutiger aero islands',
  isla: `${tr('tu isla', 'your island')} | frutiger aero islands`,
  auth: `${tr('cuenta', 'account')} | frutiger aero islands`,
  explorar: `${tr('explorar', 'explore')} | frutiger aero islands`,
  visita: `${tr('visita', 'visit')} | frutiger aero islands`,
};

/** la cuenta muestra el formulario solo si no hay sesión; con sesión muestra la cuenta. */
function Cuenta() {
  const session = useSession();
  if (session.status === 'cargando') return <AeroLoader variant="page" text={tr('comprobando tu sesión...', 'checking your session...')} detail={tr('verificando la llave de tu archipiélago...', 'verifying the key to your archipelago...')} />;
  return session.status === 'con-sesion' ? <AccountPanel session={session} /> : <AuthPage />;
}

const WorldPage = lazy(() => import('../features/world/WorldPage').then((m) => ({ default: m.WorldPage })));
const RankingPage = lazy(() => import('../features/world/RankingPage').then((m) => ({ default: m.RankingPage })));
const RulesPage = lazy(() => import('../features/legal/RulesPage').then((m) => ({ default: m.RulesPage })));
const ArcadePage = lazy(() => import('../features/arcade/ArcadePage').then((m) => ({ default: m.ArcadePage })));
const AvatarEditor = lazy(() => import('../features/avatar/AvatarEditor').then((m) => ({ default: m.AvatarEditor })));
const ExplorePage = lazy(() => import('../features/community/ExplorePage').then((m) => ({ default: m.ExplorePage })));
const PaintballPage = lazy(() => import('../features/paintball/PaintballPage').then((m) => ({ default: m.PaintballPage })));
const ArenaPage = lazy(() => import('../features/arena/ArenaPage').then((m) => ({ default: m.ArenaPage })));
const BlobPage = lazy(() => import('../features/blob/BlobPage').then((m) => ({ default: m.BlobPage })));
const RoyalePage = lazy(() => import('../features/royale/RoyalePage').then((m) => ({ default: m.RoyalePage })));
const EditorPage = lazy(() => import('../features/editor/EditorPage').then((m) => ({ default: m.EditorPage })));
const MyIslandPage = lazy(() => import('../features/community/IslandPages').then((m) => ({ default: m.MyIslandPage })));
const VisitIslandPage = lazy(() => import('../features/community/IslandPages').then((m) => ({ default: m.VisitIslandPage })));
const LoadingRoute = ({ text }: { text: string }) => <AeroLoader variant="page" text={text} />;

function Inicio() {
  const session = useSession();
  const planet = useRestoration();
  useEffect(() => void restorationStore.refresh(), []);
  useEffect(() => {
    if (session.status === 'con-sesion') prefetchWorld();
  }, [session.status]);
  if (session.status === 'cargando') return <div className="app"><Backdrop /><main className="main"><AeroLoader text={tr('preparando tu archipiélago...', 'preparing your archipelago...')} detail={tr('la marea está conectando tu cuenta...', 'the tide is connecting your account...')} /></main></div>;
  const signed = session.status === 'con-sesion';
  return (
    <div className={`landing${signed ? ' landing--member' : ''}`}>
      <AeroAtmosphere />
      <div className="landing__sky" aria-hidden="true"><i /><i /><i /></div>
      <header className="landing__bar">
        <Brand />
        <aside className="landing__signal" aria-label={tr('estado de la comunidad', 'community status')}>
          <span className="landing__dot" aria-hidden="true" />
          <strong>{signed ? tr('conectado', 'connected') : tr('acceso protegido', 'protected access')}</strong>
          <small>{signed ? `${tr('planeta restaurado', 'planet restored')} ${planet.toFixed(planet < 10 ? 1 : 0)}%` : tr('inicia sesión para entrar', 'sign in to enter')}</small>
        </aside>
      </header>
      <section className="landing__copy" aria-labelledby="titulo-vista">
        <h1 id="titulo-vista" tabIndex={-1} data-vista-titulo>{signed ? tr('tu isla está lista.', 'your island is ready.') : tr('un mundo de islas, hecho por personas.', 'a world of islands, made by people.')}</h1>
        <EraStrip />
        <p>{signed ? `${tr('vuelve a', 'go back to')} ${session.username ? `@${session.username}` : tr('tu isla', 'your island')} ${tr('y continúa donde lo dejaste.', 'and pick up where you left off.')}` : tr('crea una cuenta para diseñar tu isla, guardar cada objeto y visitar a otros jugadores.', 'create an account to design your island, save every object and visit other players. or try it first, no account needed.')}</p>
      </section>
      <nav className="landing__actions" aria-label={signed ? tr('continuar jugando', 'keep playing') : tr('empezar', 'get started')}>
          {signed ? <><a className="vista-button vista-button--primary" href={routeHref('isla')} onClick={() => { sfx.click(); if (music.wantsMusic()) void music.play(); }}>{tr('continuar en mi isla', 'continue to my island')}</a><a className="landing__text-link" href={routeHref('mundo')}>{tr('ir al mundo', 'go to the world')}</a></> : <><a className="vista-button vista-button--primary" href={routeHref('auth')}>{tr('crear cuenta o entrar', 'sign up or sign in')}</a><a className="vista-button" href={routeHref('probar')}>{tr('probar sin cuenta', 'try without an account')}</a><a className="vista-button" href="#/arena">{tr('aero arena', 'aero arena')}</a><a className="landing__text-link" href={routeHref('introduccion')}>{tr('cómo funciona', 'how it works')}</a></>}
        </nav>
      <ul className="landing__facts" aria-label={tr('qué incluye', 'what is included')}>
        <li><strong>{tr('en tu cuenta', 'in your account')}</strong><small>{tr('isla y avatar guardados', 'island and avatar saved')}</small></li>
        <li><strong>{tr('visitas públicas', 'public visits')}</strong><small>{tr('otros te encuentran', 'others can find you')}</small></li>
        <li><strong>{tr('sincronizado', 'synced')}</strong><small>{tr('mismo progreso en todo', 'same progress everywhere')}</small></li>
      </ul>
      <p className="footer-links"><a href={routeHref('reglas')}>{tr('reglas y privacidad', 'rules and privacy')}</a><span>beta</span><button type="button" className="landing__text-link" lang={lang === 'es' ? 'en' : 'es'} onClick={() => setLang(lang === 'es' ? 'en' : 'es')}>{lang === 'es' ? 'English' : 'Español'}</button></p>
    </div>
  );
}

function Introduccion() {
  const session = useSession();
  return (
    <AeroWindow className="win-welcome" title={tr('cómo se juega', 'how to play')} icon={<span className="mini-orb mini-orb--green" />}>
      <div className="welcome">
        <h1 id="titulo-vista" className="welcome__title welcome__title--sm" tabIndex={-1} data-vista-titulo>
          {tr('así funciona tu isla', 'how your island works')}
        </h1>
        <ol className="steps">
          <li>
            <strong>{tr('gana brillos.', 'earn sparkles.')}</strong> {tr('revienta burbujas (las doradas valen más), atrapa la mariposa y el pez que salta.', 'pop bubbles (the golden ones are worth more), catch the butterfly and the jumping fish.')}
          </li>
          <li>
            <strong>{tr('decora.', 'decorate.')}</strong> {tr('compra palmeras, árboles, flores, rocas, cristales, fuentes, pabellones y peces; muévelos, gíralos y cambia su tamaño.', 'buy palm trees, trees, flowers, rocks, crystals, fountains, pavilions and fish; move them, rotate them and resize them.')}
          </li>
          <li>
            <strong>{tr('sube de nivel.', 'level up.')}</strong> {tr('la variedad y la armonía entre objetos cercanos suben el encanto; cada nivel desbloquea decoraciones nuevas.', 'variety and harmony between nearby objects raise the charm; every level unlocks new decorations.')}
          </li>
        </ol>
        <p className="welcome__note">{tr('tu isla, avatar y decoraciones pertenecen a tu cuenta. cada modificación se guarda en la nube.', 'your island, avatar and decorations belong to your account. every change is saved to the cloud.')}</p>
        <nav className="intro-actions" aria-label={tr('siguientes pasos', 'next steps')}><a className="vista-button vista-button--primary" href={routeHref(session.status === 'con-sesion' ? 'isla' : 'auth')}>{session.status === 'con-sesion' ? tr('ir a mi isla', 'go to my island') : tr('crear cuenta o entrar', 'sign up or sign in')}</a><a className="landing__text-link" href={routeHref('inicio')}>{tr('volver', 'back')}</a></nav>
      </div>
    </AeroWindow>
  );
}

function AccessGate({ children }: { children: ReactNode }) {
  const session = useSession();
  if (session.status === 'con-sesion') return <>{children}</>;
  if (session.status === 'cargando') return <AeroLoader variant="page" text={tr('comprobando tu cuenta...', 'checking your account...')} detail={tr('abriendo una ruta segura al archipiélago...', 'opening a secure route to the archipelago...')} />;
  return <div className="app"><Backdrop /><main className="main"><section className="access-gate" aria-labelledby="access-title"><span className="mini-orb" aria-hidden="true" /><p>{tr('archipiélago online', 'online archipelago')}</p><h1 id="access-title">{tr('entra para jugar', 'sign in to play')}</h1><span>{tr('tu isla, personaje y progreso están ligados a una cuenta.', 'your island, character and progress are tied to an account.')}</span><a className="vista-button vista-button--primary" href={routeHref('auth')}>{tr('crear cuenta o entrar', 'sign up or sign in')}</a><a className="vista-button" href={routeHref('probar')}>{tr('probar sin cuenta', 'try without an account')}</a><a className="landing__text-link" href={routeHref('inicio')}>{tr('volver a la bienvenida', 'back to the welcome screen')}</a></section></main></div>;
}

function Routes() {
  const routeState = useHashRoute();
  const route = routeState.route;
  const session = useSession();
  const primera = useRef(true);

  useEffect(() => music.armFirstGesture(), []);

  /* presencia: con sesión, avisamos cada minuto desde cualquier pantalla para que los demás nos vean en línea */
  useEffect(() => {
    if (session.status !== 'con-sesion' || !session.username) return;
    const beat = () => void touchMyPresence().catch(() => undefined);
    beat();
    return everyWhileVisible(beat, 60_000);
  }, [session.status, session.username]);

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
      veil.show(tr('abriendo tu isla', 'opening your island'));
      timer = window.setTimeout(() => !sceneBridge.get() && veil.hide(), 4000);
    } else if (route === 'mundo') {
      veil.show(before === 'isla' ? tr('viajando al mundo', 'traveling to the world') : tr('abriendo el mundo', 'opening the world'));
    } else if (route === 'visita') {
      veil.show(routeState.username ? `${tr('viajando a la isla de', 'traveling to the island of')} @${routeState.username}` : tr('visitando una isla', 'visiting an island'), 'viaje');
      timer = window.setTimeout(() => !sceneBridge.get() && veil.hide(), 4000);
    } else if (before === 'isla' || before === 'mundo' || before === 'visita') {
      veil.show(tr('volviendo', 'going back'));
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

  if (route === 'ranking') return <AccessGate><div className="app"><Backdrop /><main className="main"><Suspense fallback={<LoadingRoute text={tr('abriendo el ranking...', 'opening the ranking...')} />}><RankingPage /></Suspense></main><Taskbar /></div></AccessGate>;
  if (route === 'reglas') return <div className="app"><Backdrop /><main className="main"><Suspense fallback={<LoadingRoute text={tr('abriendo las reglas...', 'opening the rules...')} />}><RulesPage /></Suspense></main></div>;
  if (route === 'auth') return <div className="app"><Backdrop /><main className="main"><Cuenta /></main>{session.status === 'con-sesion' && <Taskbar />}</div>;
  if (route === 'personaje') return <AccessGate><div className="app"><Backdrop /><main className="main"><Suspense fallback={<LoadingRoute text={tr('abriendo el personaje...', 'opening the character editor...')} />}><AvatarEditor /></Suspense></main><Taskbar /></div></AccessGate>;
  if (route === 'arcade') return <AccessGate><Suspense fallback={<AeroLoader variant="scene" text={tr('abriendo el arcade...', 'opening the arcade...')} detail={tr('preparando desafíos sobre el agua...', 'getting challenges ready on the water...')} />}><ArcadePage onExit={() => { window.location.hash = routeHref('mundo'); }} onReward={(suns) => { awardSoles(suns); }} /></Suspense></AccessGate>;
  if (route === 'explorar') return <AccessGate><div className="app"><Backdrop /><main className="main"><Suspense fallback={<LoadingRoute text={tr('buscando islas...', 'looking for islands...')} />}><ExplorePage /></Suspense></main><Taskbar /></div></AccessGate>;
  if (route === 'visita' && routeState.username) return <AccessGate><Suspense fallback={<LoadingRoute text={tr('visitando isla...', 'visiting island...')} />}><VisitIslandPage username={routeState.username} /></Suspense></AccessGate>;
  if (route === 'mundo') {
    return (
      <AccessGate><Suspense fallback={<AeroLoader variant="scene" text={tr('preparando el mundo...', 'preparing the world...')} detail={tr('trazando rutas y señales del atlas...', 'plotting routes and atlas signals...')} />}><WorldPage /></Suspense></AccessGate>
    );
  }

  if (route === 'blob') return <Suspense fallback={<LoadingRoute text={tr('preparando la arena...', 'getting the arena ready...')} />}><BlobPage /></Suspense>;
  if (route === 'paintball') return <Suspense fallback={<LoadingRoute text={tr('preparando la arena...', 'getting the arena ready...')} />}><PaintballPage /></Suspense>;
  if (route === 'arena') return <Suspense fallback={<LoadingRoute text={tr('abriendo la arena...', 'opening the arena...')} />}><ArenaPage /></Suspense>;
  if (route === 'royale') return <Suspense fallback={<LoadingRoute text={tr('preparando la arena...', 'getting the arena ready...')} />}><RoyalePage /></Suspense>;

  /* modo prueba: la isla funciona sin cuenta y se guarda solo en este dispositivo */
  if (route === 'probar') return <Suspense fallback={<LoadingRoute text={tr('cargando la isla...', 'loading the island...')} />}><EditorPage demo /></Suspense>;

  if (route === 'isla') {
    return (
      <AccessGate><Suspense fallback={<LoadingRoute text={tr('cargando la isla...', 'loading the island...')} />}><MyIslandPage /></Suspense></AccessGate>
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

/** cuando el navegador está libre, baja por adelantado las pantallas pesadas para que abrirlas sea instantáneo. */
function useIdlePrefetch() {
  const session = useSession();
  useEffect(() => {
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const run = () => {
      void import('../features/editor/EditorPage').catch(() => undefined);
      void import('../features/phone/PhonePanel').catch(() => undefined);
      if (session.status === 'con-sesion') {
        void import('../features/world/WorldPage').catch(() => undefined);
        void import('../features/community/IslandPages').catch(() => undefined);
      }
    };
    const conn = (navigator as unknown as { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData) return undefined;
    const handle = idle ? idle(run, { timeout: 4000 }) : window.setTimeout(run, 2500);
    return () => {
      if (!idle) window.clearTimeout(handle);
    };
  }, [session.status]);
}

export function App() {
  useIdlePrefetch();
  return (
    <>
      <Routes />
      <Veil />
    </>
  );
}
