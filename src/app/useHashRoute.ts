import { useCallback, useEffect, useState } from 'react';

export type Route = 'inicio' | 'introduccion' | 'isla' | 'mundo' | 'auth' | 'explorar' | 'visita' | 'personaje' | 'arcade' | 'reglas' | 'ranking' | 'probar' | 'royale' | 'blob' | 'paintball' | 'arena';
export interface RouteState { route: Route; username?: string }

const PATHS: Record<Route, string> = {
  inicio: '/',
  introduccion: '/introduccion',
  isla: '/isla',
  mundo: '/mundo',
  personaje: '/personaje',
  arcade: '/arcade',
  reglas: '/reglas',
  ranking: '/ranking',
  probar: '/probar',
  royale: '/royale',
  blob: '/blob',
  paintball: '/paintball',
  arena: '/arena',
  auth: '/auth',
  explorar: '/explorar',
  visita: '/island',
};

export function parseHash(hash: string): RouteState {
  const path = hash.replace(/^#/, '') || '/';
  if (path === PATHS.introduccion) return { route: 'introduccion' };
  if (path === PATHS.isla) return { route: 'isla' };
  if (path === PATHS.mundo) return { route: 'mundo' };
  if (path === PATHS.personaje) return { route: 'personaje' };
  if (path === PATHS.arcade) return { route: 'arcade' };
  if (path === PATHS.reglas) return { route: 'reglas' };
  if (path === PATHS.ranking) return { route: 'ranking' };
  if (path === PATHS.probar) return { route: 'probar' };
  if (path === PATHS.royale) return { route: 'royale' };
  if (path === PATHS.blob) return { route: 'blob' };
  if (path === PATHS.paintball) return { route: 'paintball' };
  if (path === PATHS.arena) return { route: 'arena' };
  if (path === PATHS.auth) return { route: 'auth' };
  if (path === PATHS.explorar) return { route: 'explorar' };
  const visit = path.match(/^\/island\/([a-z0-9_]{3,24})$/i);
  if (visit) return { route: 'visita', username: visit[1].toLowerCase() };
  return { route: 'inicio' };
}

export function routeHref(route: Exclude<Route, 'visita'>): string {
  return `#${PATHS[route]}`;
}
export function islandHref(username: string): string { return `#${PATHS.visita}/${encodeURIComponent(username)}`; }

export function useHashRoute(): RouteState {
  const [route, setRoute] = useState<RouteState>(() => parseHash(window.location.hash));
  const sync = useCallback(() => setRoute(parseHash(window.location.hash)), []);
  useEffect(() => {
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [sync]);
  return route;
}
