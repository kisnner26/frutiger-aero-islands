import { Component, type ErrorInfo, type ReactNode } from 'react';
import { BrandOrb } from './Brand';
import { tr } from '../i18n';
import { veil } from './veilStore';

interface State { failed: boolean; detail: string }

const CHUNK_ERROR = /dynamically imported module|Importing a module script failed|Failed to fetch|Loading chunk|error loading dynamically/i;

/** tras una versión nueva, una pestaña abierta pide archivos viejos que ya no existen: se recarga sola una vez. */
export function reloadOnceForNewVersion(message: string): boolean {
  if (!CHUNK_ERROR.test(message)) return false;
  try {
    if (window.sessionStorage.getItem('fai:recarga-version')) return false;
    window.sessionStorage.setItem('fai:recarga-version', '1');
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

/** red de seguridad: si algo falla al dibujar, la persona ve una salida clara en vez de una pantalla en blanco. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false, detail: '' };

  static getDerivedStateFromError(error: unknown): State {
    return { failed: true, detail: String((error as Error)?.message ?? error).slice(0, 160) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (reloadOnceForNewVersion(String(error?.message ?? error))) return;
    veil.hide(true);
    console.error('error de la interfaz', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="app-crash" role="alert">
        <BrandOrb size={64} />
        <h1>{tr('algo se interrumpió', 'something got interrupted')}</h1>
        <p>{tr('tu isla está a salvo. vuelve a intentarlo o regresa al inicio.', 'your island is safe. try again or go back to the start.')}</p>
        {this.state.detail && <p style={{ fontSize: 12, opacity: 0.75, maxWidth: 520 }}>{this.state.detail}</p>}
        <div className="app-crash__actions">
          <button type="button" className="vista-button vista-button--primary" onClick={() => window.location.reload()}>{tr('recargar', 'reload')}</button>
          <button type="button" className="vista-button" onClick={() => { window.location.hash = '#/'; this.setState({ failed: false, detail: '' }); }}>{tr('ir al inicio', 'go to the start')}</button>
        </div>
      </div>
    );
  }
}
