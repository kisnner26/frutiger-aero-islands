import { Component, type ErrorInfo, type ReactNode } from 'react';
import { BrandOrb } from './Brand';
import { tr } from '../i18n';
import { veil } from './veilStore';

interface State { failed: boolean }

/** red de seguridad: si algo falla al dibujar, la persona ve una salida clara en vez de una pantalla en blanco. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
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
        <div className="app-crash__actions">
          <button type="button" className="vista-button vista-button--primary" onClick={() => window.location.reload()}>{tr('recargar', 'reload')}</button>
          <button type="button" className="vista-button" onClick={() => { window.location.hash = '#/'; this.setState({ failed: false }); }}>{tr('ir al inicio', 'go to the start')}</button>
        </div>
      </div>
    );
  }
}
