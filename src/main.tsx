import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { veil } from './ui/veilStore';
import './styles/tokens.css';
import './styles/global.css';
import './styles/aero.css';
import './styles/game.css';
import './styles/phone.css';
import './styles/polish.css';
import './styles/brand.css';
import './features/avatar/avatar.css';

import './persistence/installApp';
import { reloadOnceForNewVersion } from './ui/ErrorBoundary';

performance.mark('app:inicio');
// caché sin conexión: solo en producción; la versión cambia en cada compilación para que se renueve sola
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const register = () => {
    // salida de emergencia: ?nosw=1 desactiva la caché y borra lo guardado
    if (new URLSearchParams(window.location.search).has('nosw')) {
      void navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => void r.unregister()));
      void caches.keys().then((ks) => ks.forEach((k) => void caches.delete(k)));
      return;
    }
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js?v=${__BUILD_ID__}`).catch(() => undefined);
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register);
}
// versión nueva publicada mientras la pestaña seguía abierta: recarga una vez en vez de dejar un error
window.addEventListener('vite:preloadError', () => void reloadOnceForNewVersion('Failed to fetch dynamically imported module'));
// un error suelto nunca debe dejar el velo de transición tapando el juego
window.addEventListener('unhandledrejection', () => veil.hide(true));
window.addEventListener('error', () => veil.hide(true));
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
